import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
  Logger,
} from '@nestjs/common';
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
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly membersService: MembersService,
    private readonly faceService: FaceService,
  ) {}

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
