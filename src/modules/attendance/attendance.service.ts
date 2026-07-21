import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
  Logger, OnModuleInit,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  QrScanDto, MarkAttendanceDto, AttendanceFilterDto,
  CreateSessionDto, AttendanceStatus,
} from './dto/attendance.dto';
import { parseQrPayload, haversineDistance } from '../../common/utils/qr.util';
import { decrypt } from '../../common/utils/crypto.util';
import { MembersService } from '../members/members.service';
import { FaceService } from '../members/face.service';

@Injectable()
export class AttendanceService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly membersService: MembersService,
    private readonly faceService: FaceService,
  ) {}

  async onModuleInit() {
    await this.db.query(
      `ALTER TABLE attendance.records ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ`,
    );
  }

  // ── Sessions ─────────────────────────────────────────────

  private async resolveAdminId(userId: string): Promise<string | null> {
    const rows = await this.db.query(
      `SELECT id FROM core.admins WHERE user_id = $1 LIMIT 1`, [userId],
    );
    return rows[0]?.id ?? null;
  }

  async createSession(dto: CreateSessionDto, userId: string) {
    const adminId = await this.resolveAdminId(userId);
    this.logger.log(`createSession: userId=${userId} adminId=${adminId}`);
    if (!adminId) throw new BadRequestException('Admin profile not found for this user');
    const result = await this.db.query(
      `INSERT INTO attendance.sessions
        (title, session_type, session_date, start_time, end_time,
         location_name, latitude, longitude, allowed_radius_meters,
         is_location_restricted, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        dto.title, dto.sessionType, dto.sessionDate,
        dto.startTime ?? null, dto.endTime ?? null,
        dto.locationName ?? null, dto.latitude ?? null, dto.longitude ?? null,
        dto.allowedRadiusMeters ?? 100, dto.isLocationRestricted ?? false,
        dto.notes ?? null, adminId,
      ],
    );
    return result[0];
  }

  async getSessions(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await this.db.query(
      `SELECT s.*, a.full_name AS created_by_name,
              (SELECT COUNT(*) FROM attendance.records r WHERE r.session_id = s.id) AS total_scanned
       FROM attendance.sessions s
       LEFT JOIN core.admins a ON a.id = s.created_by
       ORDER BY s.session_date DESC, s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return rows;
  }

  async getSession(sessionId: string) {
    const rows = await this.db.query(
      `SELECT * FROM attendance.daily_summary WHERE session_id = $1`, [sessionId],
    );
    if (!rows.length) throw new NotFoundException('Session not found');
    return rows[0];
  }

  async deleteSession(sessionId: string) {
    const rows = await this.db.query(
      `SELECT id FROM attendance.sessions WHERE id = $1`, [sessionId],
    );
    if (!rows.length) throw new NotFoundException('Session not found');
    await this.db.query(`DELETE FROM attendance.records WHERE session_id = $1`, [sessionId]);
    await this.db.query(`DELETE FROM attendance.qr_scan_logs WHERE session_id = $1`, [sessionId]);
    await this.db.query(`DELETE FROM attendance.sessions WHERE id = $1`, [sessionId]);
    return { message: 'Session deleted' };
  }

  // ── QR Scan (core attendance flow) ──────────────────────

  async processQrScan(dto: QrScanDto, userId: string) {
    const adminId = await this.resolveAdminId(userId);
    // 1. Parse raw QR payload
    let payload: { memberId: string; token: string };
    try {
      payload = parseQrPayload(dto.qrPayload);
    } catch {
      await this.logScan(dto, null, adminId, false, 'invalid_token');
      throw new BadRequestException('Invalid QR code');
    }

    // 2. Load session
    const sessionRows = await this.db.query(
      `SELECT * FROM attendance.sessions WHERE id = $1`, [dto.sessionId],
    );
    if (!sessionRows.length) throw new NotFoundException('Session not found');
    const session = sessionRows[0];

    // 3. Resolve member by member_id code
    const memberRows = await this.db.query(
      `SELECT id, full_name, member_id, status, qr_token
       FROM core.members WHERE member_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [payload.memberId],
    );
    if (!memberRows.length) {
      await this.logScan(dto, null, adminId, false, 'member_not_found');
      throw new NotFoundException('Member not found');
    }
    const member = memberRows[0];

    // 4. Validate member active
    if (member.status !== 'active') {
      await this.logScan(dto, member.id, adminId, false, 'inactive_member');
      throw new BadRequestException('Member account is not active');
    }

    // 5. Validate QR token matches stored encrypted token
    if (member.qr_token !== payload.token) {
      await this.logScan(dto, member.id, adminId, false, 'token_mismatch');
      throw new BadRequestException('QR code is invalid or has been regenerated');
    }

    // 6. Check location restriction
    let locationValid = true;
    if (
      session.is_location_restricted &&
      session.latitude !== null && dto.latitude !== undefined
    ) {
      const dist = haversineDistance(
        session.latitude, session.longitude,
        dto.latitude!, dto.longitude!,
      );
      locationValid = dist <= session.allowed_radius_meters;
    }

    if (!locationValid) {
      await this.logScan(dto, member.id, adminId, false, 'location_fail');
      throw new BadRequestException(
        `You are outside the allowed attendance zone (${session.allowed_radius_meters}m radius)`,
      );
    }

    // 7. Check duplicate
    const existing = await this.db.query(
      `SELECT id FROM attendance.records
       WHERE session_id = $1 AND member_id = $2`, [dto.sessionId, member.id],
    );
    if (existing.length) {
      await this.logScan(dto, member.id, adminId, false, 'duplicate');
      throw new ConflictException(
        `Attendance already marked for ${member.full_name} in this session`,
      );
    }

    // 8. Determine status (present vs late)
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    if (session.start_time) {
      const sessionStart = new Date(`${session.session_date}T${session.start_time}`);
      const lateThresholdMs = 15 * 60 * 1000; // 15 minutes
      if (new Date() > new Date(sessionStart.getTime() + lateThresholdMs)) {
        status = AttendanceStatus.LATE;
      }
    }

    // 9. Insert attendance record
    const record = await this.db.query(
      `INSERT INTO attendance.records
        (session_id, member_id, attendance_status, check_in_time, check_in_method,
         check_in_latitude, check_in_longitude, scanned_by_admin, device_name,
         ip_address, is_location_valid)
       VALUES ($1,$2,$3,NOW(),'qr_scan',$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        dto.sessionId, member.id, status,
        dto.latitude ?? null, dto.longitude ?? null,
        adminId, dto.deviceName ?? null, null, locationValid,
      ],
    );

    await this.logScan(dto, member.id, adminId, true, null);

    return {
      success: true,
      attendanceId: record[0].id,
      member: {
        id: member.id,
        memberId: member.member_id,
        fullName: member.full_name,
      },
      status,
      checkInTime: record[0].check_in_time,
      sessionTitle: session.title,
    };
  }

  // ── Manual mark ──────────────────────────────────────────

  async markManual(dto: MarkAttendanceDto, userId: string) {
    const adminId = await this.resolveAdminId(userId);
    const memberRows = await this.db.query(
      `SELECT id, full_name FROM core.members WHERE id = $1 AND deleted_at IS NULL`, [dto.memberId],
    );
    if (!memberRows.length) throw new NotFoundException('Member not found');

    const existing = await this.db.query(
      `SELECT id FROM attendance.records WHERE session_id = $1 AND member_id = $2`,
      [dto.sessionId, dto.memberId],
    );

    if (existing.length) {
      // Update existing record
      await this.db.query(
        `UPDATE attendance.records SET attendance_status = $1, override_reason = $2,
         scanned_by_admin = $3, updated_at = NOW()
         WHERE session_id = $4 AND member_id = $5`,
        [dto.status, dto.overrideReason ?? null, adminId, dto.sessionId, dto.memberId],
      );
    } else {
      await this.db.query(
        `INSERT INTO attendance.records
          (session_id, member_id, attendance_status, check_in_time, check_in_method,
           scanned_by_admin, override_reason, notes)
         VALUES ($1,$2,$3,NOW(),'manual',$4,$5,$6)`,
        [dto.sessionId, dto.memberId, dto.status, adminId,
         dto.overrideReason ?? null, dto.notes ?? null],
      );
    }
    return { message: 'Attendance marked', member: memberRows[0], status: dto.status };
  }

  // ── Get attendance for session ───────────────────────────

  async getSessionAttendance(sessionId: string, filter: AttendanceFilterDto) {
    const rows = await this.db.query(
      `SELECT r.*, m.full_name, m.member_id AS member_code,
              m.instrument, m.photo_url
       FROM attendance.records r
       JOIN core.members m ON m.id = r.member_id
       WHERE r.session_id = $1
       ORDER BY r.check_in_time ASC NULLS LAST`,
      [sessionId],
    );
    return rows;
  }

  // ── Get member attendance history ────────────────────────

  async getMemberHistory(memberId: string, filter: AttendanceFilterDto) {
    const page = Math.max(1, Number(filter.page ?? 1));
    const limit = Math.min(100, Number(filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [`r.member_id = $1`];
    const params: any[] = [memberId];
    let idx = 2;

    if (filter.fromDate) {
      conditions.push(`s.session_date >= $${idx}`); params.push(filter.fromDate); idx++;
    }
    if (filter.toDate) {
      conditions.push(`s.session_date <= $${idx}`); params.push(filter.toDate); idx++;
    }
    if (filter.status) {
      conditions.push(`r.attendance_status = $${idx}`); params.push(filter.status); idx++;
    }

    const rows = await this.db.query(
      `SELECT r.*, s.title AS session_title, s.session_date, s.session_type
       FROM attendance.records r
       JOIN attendance.sessions s ON s.id = r.session_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.session_date DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );
    return rows;
  }

  // ── Face Scan Attendance ─────────────────────────────────

  async processFaceScan(
    sessionId: string,
    imageBuffer: Buffer,
    userId: string,
  ) {
    if (!this.faceService.isReady) {
      throw new BadRequestException(
        'Face recognition is not available. Run: node scripts/download-face-models.js and restart the server.',
      );
    }

    const adminId = await this.resolveAdminId(userId);

    // Load session
    const sessionRows = await this.db.query(
      `SELECT * FROM attendance.sessions WHERE id = $1`, [sessionId],
    );
    if (!sessionRows.length) throw new NotFoundException('Session not found');
    const session = sessionRows[0];

    // Extract face descriptor from incoming image
    const probe = await this.faceService.extractDescriptor(imageBuffer);
    if (!probe) {
      throw new BadRequestException('No face detected in the photo. Please try again with a clear face photo.');
    }

    // Get all stored descriptors
    const candidates = await this.membersService.getAllFaceDescriptors();
    if (!candidates.length) {
      throw new BadRequestException('No members have registered face photos yet. Upload photos for members first.');
    }

    // Find closest match (threshold 0.5 = ~50% confidence)
    const match = this.faceService.findClosestMatch(probe, candidates);
    if (!match) {
      throw new BadRequestException('Face not recognised. The person may not be a registered member or photo quality is low.');
    }

    // Load matched member
    const memberRows = await this.db.query(
      `SELECT id, full_name, member_id, status FROM core.members WHERE id = $1 AND deleted_at IS NULL`,
      [match.id],
    );
    if (!memberRows.length) throw new NotFoundException('Matched member not found');
    const member = memberRows[0];

    if (member.status !== 'active') {
      throw new BadRequestException(`${member.full_name}'s account is not active`);
    }

    // Check duplicate
    const existing = await this.db.query(
      `SELECT id FROM attendance.records WHERE session_id = $1 AND member_id = $2`,
      [sessionId, member.id],
    );
    if (existing.length) {
      throw new ConflictException(`Attendance already marked for ${member.full_name}`);
    }

    // Determine status
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    if (session.start_time) {
      const sessionStart = new Date(`${session.session_date}T${session.start_time}`);
      if (new Date() > new Date(sessionStart.getTime() + 15 * 60 * 1000)) {
        status = AttendanceStatus.LATE;
      }
    }

    // Insert record
    const record = await this.db.query(
      `INSERT INTO attendance.records
        (session_id, member_id, attendance_status, check_in_time, check_in_method, scanned_by_admin)
       VALUES ($1,$2,$3,NOW(),'face_scan',$4) RETURNING *`,
      [sessionId, member.id, status, adminId],
    );

    return {
      success: true,
      attendanceId: record[0].id,
      member: {
        id: member.id,
        memberId: member.member_id,
        fullName: member.full_name,
      },
      status,
      confidence: Math.round((1 - match.distance / 0.5) * 100),
      checkInTime: record[0].check_in_time,
      sessionTitle: session.title,
    };
  }

  // ── Clock Out (by record ID — manual button) ─────────────

  async clockOut(recordId: string) {
    const rows = await this.db.query(
      `SELECT r.id, r.check_out_time, m.full_name
       FROM attendance.records r JOIN core.members m ON m.id = r.member_id
       WHERE r.id = $1`, [recordId],
    );
    if (!rows.length) throw new NotFoundException('Attendance record not found');
    if (rows[0].check_out_time) throw new BadRequestException('Member has already clocked out');
    const result = await this.db.query(
      `UPDATE attendance.records SET check_out_time = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING check_out_time`,
      [recordId],
    );
    return { memberName: rows[0].full_name, checkOutTime: result[0].check_out_time };
  }

  // ── Clock Out via QR scan ─────────────────────────────────

  async clockOutByQr(dto: QrScanDto) {
    let payload: any;
    try { payload = parseQrPayload(dto.qrPayload); } catch {
      throw new BadRequestException('Invalid QR code');
    }

    const memberRows = await this.db.query(
      `SELECT id, full_name FROM core.members WHERE member_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [payload.memberId],
    );
    if (!memberRows.length) throw new NotFoundException('Member not found');
    const member = memberRows[0];

    const recordRows = await this.db.query(
      `SELECT id, check_out_time FROM attendance.records
       WHERE session_id = $1 AND member_id = $2`,
      [dto.sessionId, member.id],
    );
    if (!recordRows.length) throw new NotFoundException('No check-in record found for this member in this session');
    if (recordRows[0].check_out_time) throw new ConflictException(`${member.full_name} has already clocked out`);

    const result = await this.db.query(
      `UPDATE attendance.records SET check_out_time = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING check_out_time`,
      [recordRows[0].id],
    );
    return { memberName: member.full_name, checkOutTime: result[0].check_out_time };
  }

  // ── Clock Out via face scan ───────────────────────────────

  async clockOutByFace(sessionId: string, photoBuffer: Buffer) {
    const allDescriptors = await this.membersService.getAllFaceDescriptors();
    if (!allDescriptors.length) throw new BadRequestException('No face profiles registered');

    const queryDescriptor = await this.faceService.extractDescriptor(photoBuffer);
    if (!queryDescriptor) throw new BadRequestException('No face detected in photo');

    const bestMatch = this.faceService.findClosestMatch(queryDescriptor, allDescriptors);
    if (!bestMatch) throw new NotFoundException('Face not recognised');

    const memberRows = await this.db.query(
      `SELECT id, full_name FROM core.members WHERE id = $1`, [bestMatch.id],
    );
    const member = memberRows[0];

    const recordRows = await this.db.query(
      `SELECT id, check_out_time FROM attendance.records
       WHERE session_id = $1 AND member_id = $2`,
      [sessionId, member.id],
    );
    if (!recordRows.length) throw new NotFoundException('No check-in record found for this member in this session');
    if (recordRows[0].check_out_time) throw new ConflictException(`${member.full_name} has already clocked out`);

    const result = await this.db.query(
      `UPDATE attendance.records SET check_out_time = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING check_out_time`,
      [recordRows[0].id],
    );
    return {
      memberName: member.full_name,
      checkOutTime: result[0].check_out_time,
      confidence: Math.round((1 - bestMatch.distance / 0.5) * 100),
    };
  }

  // ── Export session attendance as Excel ───────────────────

  async exportSessionExcel(sessionId: string): Promise<Buffer> {
    const session = await this.getSession(sessionId);

    const records = await this.db.query(
      `SELECT ar.attendance_status, ar.check_in_time, ar.check_in_method,
              ar.check_out_time,
              m.member_id AS member_code, m.full_name, m.instrument, m.mobile_number
       FROM attendance.records ar
       JOIN core.members m ON m.id = ar.member_id
       WHERE ar.session_id = $1
       ORDER BY ar.check_in_time ASC NULLS LAST, m.full_name ASC`,
      [sessionId],
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Avishkar DHTP System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Session Attendance', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    sheet.columns = [
      { header: 'Member ID',   key: 'member_code',        width: 18 },
      { header: 'Full Name',   key: 'full_name',           width: 26 },
      { header: 'Instrument',  key: 'instrument',          width: 14 },
      { header: 'Mobile',      key: 'mobile_number',       width: 16 },
      { header: 'Status',      key: 'attendance_status',   width: 12 },
      { header: 'Check-In',    key: 'check_in_time',       width: 22 },
      { header: 'Check-Out',   key: 'check_out_time',      width: 22 },
      { header: 'Duration',    key: 'duration',            width: 14 },
      { header: 'Method',      key: 'check_in_method',     width: 14 },
    ];

    // Header row styling
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8A0112' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getRow(1).height = 24;

    records.forEach((row: any, i: number) => {
      const checkIn  = row.check_in_time  ? new Date(row.check_in_time)  : null;
      const checkOut = row.check_out_time ? new Date(row.check_out_time) : null;
      let duration = '—';
      if (checkIn && checkOut) {
        const mins = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
        duration = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
      }

      const r = sheet.addRow({
        member_code:       row.member_code,
        full_name:         row.full_name,
        instrument:        row.instrument ? (row.instrument.charAt(0).toUpperCase() + row.instrument.slice(1)) : '—',
        mobile_number:     row.mobile_number,
        attendance_status: row.attendance_status?.toUpperCase(),
        check_in_time:     checkIn  ? checkIn.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })  : '—',
        check_out_time:    checkOut ? checkOut.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—',
        duration,
        check_in_method:   row.check_in_method ?? '—',
      });
      if (i % 2 === 1) {
        r.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F1' } };
        });
      }
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // ── Internal scan logger ─────────────────────────────────

  private async logScan(
    dto: QrScanDto, memberId: string | null, adminId: string,
    success: boolean, reason: string | null,
  ) {
    await this.db.query(
      `INSERT INTO attendance.qr_scan_logs
        (session_id, raw_qr_payload, resolved_member, scanned_by,
         success, failure_reason, latitude, longitude, device_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        dto.sessionId, dto.qrPayload, memberId, adminId,
        success, reason,
        dto.latitude ?? null, dto.longitude ?? null, dto.deviceName ?? null,
      ],
    );
  }
}
