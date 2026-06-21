"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AttendanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const ExcelJS = require("exceljs");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const attendance_dto_1 = require("./dto/attendance.dto");
const qr_util_1 = require("../../common/utils/qr.util");
const members_service_1 = require("../members/members.service");
const face_service_1 = require("../members/face.service");
let AttendanceService = AttendanceService_1 = class AttendanceService {
    constructor(db, membersService, faceService) {
        this.db = db;
        this.membersService = membersService;
        this.faceService = faceService;
        this.logger = new common_1.Logger(AttendanceService_1.name);
    }
    async onModuleInit() {
        await this.db.query(`ALTER TABLE attendance.records ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ`);
    }
    async resolveAdminId(userId) {
        const rows = await this.db.query(`SELECT id FROM core.admins WHERE user_id = $1 LIMIT 1`, [userId]);
        return rows[0]?.id ?? null;
    }
    async createSession(dto, userId) {
        const adminId = await this.resolveAdminId(userId);
        this.logger.log(`createSession: userId=${userId} adminId=${adminId}`);
        if (!adminId)
            throw new common_1.BadRequestException('Admin profile not found for this user');
        const result = await this.db.query(`INSERT INTO attendance.sessions
        (title, session_type, session_date, start_time, end_time,
         location_name, latitude, longitude, allowed_radius_meters,
         is_location_restricted, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [
            dto.title, dto.sessionType, dto.sessionDate,
            dto.startTime ?? null, dto.endTime ?? null,
            dto.locationName ?? null, dto.latitude ?? null, dto.longitude ?? null,
            dto.allowedRadiusMeters ?? 100, dto.isLocationRestricted ?? false,
            dto.notes ?? null, adminId,
        ]);
        return result[0];
    }
    async getSessions(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const rows = await this.db.query(`SELECT s.*, a.full_name AS created_by_name,
              (SELECT COUNT(*) FROM attendance.records r WHERE r.session_id = s.id) AS total_scanned
       FROM attendance.sessions s
       LEFT JOIN core.admins a ON a.id = s.created_by
       ORDER BY s.session_date DESC, s.created_at DESC
       LIMIT $1 OFFSET $2`, [limit, offset]);
        return rows;
    }
    async getSession(sessionId) {
        const rows = await this.db.query(`SELECT * FROM attendance.daily_summary WHERE session_id = $1`, [sessionId]);
        if (!rows.length)
            throw new common_1.NotFoundException('Session not found');
        return rows[0];
    }
    async deleteSession(sessionId) {
        const rows = await this.db.query(`SELECT id FROM attendance.sessions WHERE id = $1`, [sessionId]);
        if (!rows.length)
            throw new common_1.NotFoundException('Session not found');
        await this.db.query(`DELETE FROM attendance.records WHERE session_id = $1`, [sessionId]);
        await this.db.query(`DELETE FROM attendance.qr_scan_logs WHERE session_id = $1`, [sessionId]);
        await this.db.query(`DELETE FROM attendance.sessions WHERE id = $1`, [sessionId]);
        return { message: 'Session deleted' };
    }
    async processQrScan(dto, userId) {
        const adminId = await this.resolveAdminId(userId);
        let payload;
        try {
            payload = (0, qr_util_1.parseQrPayload)(dto.qrPayload);
        }
        catch {
            await this.logScan(dto, null, adminId, false, 'invalid_token');
            throw new common_1.BadRequestException('Invalid QR code');
        }
        const sessionRows = await this.db.query(`SELECT * FROM attendance.sessions WHERE id = $1`, [dto.sessionId]);
        if (!sessionRows.length)
            throw new common_1.NotFoundException('Session not found');
        const session = sessionRows[0];
        const memberRows = await this.db.query(`SELECT id, full_name, member_id, status, qr_token
       FROM core.members WHERE member_id = $1 AND deleted_at IS NULL LIMIT 1`, [payload.memberId]);
        if (!memberRows.length) {
            await this.logScan(dto, null, adminId, false, 'member_not_found');
            throw new common_1.NotFoundException('Member not found');
        }
        const member = memberRows[0];
        if (member.status !== 'active') {
            await this.logScan(dto, member.id, adminId, false, 'inactive_member');
            throw new common_1.BadRequestException('Member account is not active');
        }
        if (member.qr_token !== payload.token) {
            await this.logScan(dto, member.id, adminId, false, 'token_mismatch');
            throw new common_1.BadRequestException('QR code is invalid or has been regenerated');
        }
        let locationValid = true;
        if (session.is_location_restricted &&
            session.latitude !== null && dto.latitude !== undefined) {
            const dist = (0, qr_util_1.haversineDistance)(session.latitude, session.longitude, dto.latitude, dto.longitude);
            locationValid = dist <= session.allowed_radius_meters;
        }
        if (!locationValid) {
            await this.logScan(dto, member.id, adminId, false, 'location_fail');
            throw new common_1.BadRequestException(`You are outside the allowed attendance zone (${session.allowed_radius_meters}m radius)`);
        }
        const existing = await this.db.query(`SELECT id FROM attendance.records
       WHERE session_id = $1 AND member_id = $2`, [dto.sessionId, member.id]);
        if (existing.length) {
            await this.logScan(dto, member.id, adminId, false, 'duplicate');
            throw new common_1.ConflictException(`Attendance already marked for ${member.full_name} in this session`);
        }
        let status = attendance_dto_1.AttendanceStatus.PRESENT;
        if (session.start_time) {
            const sessionStart = new Date(`${session.session_date}T${session.start_time}`);
            const lateThresholdMs = 15 * 60 * 1000;
            if (new Date() > new Date(sessionStart.getTime() + lateThresholdMs)) {
                status = attendance_dto_1.AttendanceStatus.LATE;
            }
        }
        const record = await this.db.query(`INSERT INTO attendance.records
        (session_id, member_id, attendance_status, check_in_time, check_in_method,
         check_in_latitude, check_in_longitude, scanned_by_admin, device_name,
         ip_address, is_location_valid)
       VALUES ($1,$2,$3,NOW(),'qr_scan',$4,$5,$6,$7,$8,$9) RETURNING *`, [
            dto.sessionId, member.id, status,
            dto.latitude ?? null, dto.longitude ?? null,
            adminId, dto.deviceName ?? null, null, locationValid,
        ]);
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
    async markManual(dto, userId) {
        const adminId = await this.resolveAdminId(userId);
        const memberRows = await this.db.query(`SELECT id, full_name FROM core.members WHERE id = $1 AND deleted_at IS NULL`, [dto.memberId]);
        if (!memberRows.length)
            throw new common_1.NotFoundException('Member not found');
        const existing = await this.db.query(`SELECT id FROM attendance.records WHERE session_id = $1 AND member_id = $2`, [dto.sessionId, dto.memberId]);
        if (existing.length) {
            await this.db.query(`UPDATE attendance.records SET attendance_status = $1, override_reason = $2,
         scanned_by_admin = $3, updated_at = NOW()
         WHERE session_id = $4 AND member_id = $5`, [dto.status, dto.overrideReason ?? null, adminId, dto.sessionId, dto.memberId]);
        }
        else {
            await this.db.query(`INSERT INTO attendance.records
          (session_id, member_id, attendance_status, check_in_time, check_in_method,
           scanned_by_admin, override_reason, notes)
         VALUES ($1,$2,$3,NOW(),'manual',$4,$5,$6)`, [dto.sessionId, dto.memberId, dto.status, adminId,
                dto.overrideReason ?? null, dto.notes ?? null]);
        }
        return { message: 'Attendance marked', member: memberRows[0], status: dto.status };
    }
    async getSessionAttendance(sessionId, filter) {
        const rows = await this.db.query(`SELECT r.*, m.full_name, m.member_id AS member_code,
              m.instrument, m.photo_url
       FROM attendance.records r
       JOIN core.members m ON m.id = r.member_id
       WHERE r.session_id = $1
       ORDER BY r.check_in_time ASC NULLS LAST`, [sessionId]);
        return rows;
    }
    async getMemberHistory(memberId, filter) {
        const page = Math.max(1, Number(filter.page ?? 1));
        const limit = Math.min(100, Number(filter.limit ?? 20));
        const offset = (page - 1) * limit;
        const conditions = [`r.member_id = $1`];
        const params = [memberId];
        let idx = 2;
        if (filter.fromDate) {
            conditions.push(`s.session_date >= $${idx}`);
            params.push(filter.fromDate);
            idx++;
        }
        if (filter.toDate) {
            conditions.push(`s.session_date <= $${idx}`);
            params.push(filter.toDate);
            idx++;
        }
        if (filter.status) {
            conditions.push(`r.attendance_status = $${idx}`);
            params.push(filter.status);
            idx++;
        }
        const rows = await this.db.query(`SELECT r.*, s.title AS session_title, s.session_date, s.session_type
       FROM attendance.records r
       JOIN attendance.sessions s ON s.id = r.session_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.session_date DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]);
        return rows;
    }
    async processFaceScan(sessionId, imageBuffer, userId) {
        if (!this.faceService.isReady) {
            throw new common_1.BadRequestException('Face recognition is not available. Run: node scripts/download-face-models.js and restart the server.');
        }
        const adminId = await this.resolveAdminId(userId);
        const sessionRows = await this.db.query(`SELECT * FROM attendance.sessions WHERE id = $1`, [sessionId]);
        if (!sessionRows.length)
            throw new common_1.NotFoundException('Session not found');
        const session = sessionRows[0];
        const probe = await this.faceService.extractDescriptor(imageBuffer);
        if (!probe) {
            throw new common_1.BadRequestException('No face detected in the photo. Please try again with a clear face photo.');
        }
        const candidates = await this.membersService.getAllFaceDescriptors();
        if (!candidates.length) {
            throw new common_1.BadRequestException('No members have registered face photos yet. Upload photos for members first.');
        }
        const match = this.faceService.findClosestMatch(probe, candidates);
        if (!match) {
            throw new common_1.BadRequestException('Face not recognised. The person may not be a registered member or photo quality is low.');
        }
        const memberRows = await this.db.query(`SELECT id, full_name, member_id, status FROM core.members WHERE id = $1 AND deleted_at IS NULL`, [match.id]);
        if (!memberRows.length)
            throw new common_1.NotFoundException('Matched member not found');
        const member = memberRows[0];
        if (member.status !== 'active') {
            throw new common_1.BadRequestException(`${member.full_name}'s account is not active`);
        }
        const existing = await this.db.query(`SELECT id FROM attendance.records WHERE session_id = $1 AND member_id = $2`, [sessionId, member.id]);
        if (existing.length) {
            throw new common_1.ConflictException(`Attendance already marked for ${member.full_name}`);
        }
        let status = attendance_dto_1.AttendanceStatus.PRESENT;
        if (session.start_time) {
            const sessionStart = new Date(`${session.session_date}T${session.start_time}`);
            if (new Date() > new Date(sessionStart.getTime() + 15 * 60 * 1000)) {
                status = attendance_dto_1.AttendanceStatus.LATE;
            }
        }
        const record = await this.db.query(`INSERT INTO attendance.records
        (session_id, member_id, attendance_status, check_in_time, check_in_method, scanned_by_admin)
       VALUES ($1,$2,$3,NOW(),'face_scan',$4) RETURNING *`, [sessionId, member.id, status, adminId]);
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
    async clockOut(recordId) {
        const rows = await this.db.query(`SELECT r.id, r.check_out_time, m.full_name
       FROM attendance.records r JOIN core.members m ON m.id = r.member_id
       WHERE r.id = $1`, [recordId]);
        if (!rows.length)
            throw new common_1.NotFoundException('Attendance record not found');
        if (rows[0].check_out_time)
            throw new common_1.BadRequestException('Member has already clocked out');
        const result = await this.db.query(`UPDATE attendance.records SET check_out_time = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING check_out_time`, [recordId]);
        return { memberName: rows[0].full_name, checkOutTime: result[0].check_out_time };
    }
    async clockOutByQr(dto) {
        let payload;
        try {
            payload = (0, qr_util_1.parseQrPayload)(dto.qrPayload);
        }
        catch {
            throw new common_1.BadRequestException('Invalid QR code');
        }
        const memberRows = await this.db.query(`SELECT id, full_name FROM core.members WHERE member_id = $1 AND deleted_at IS NULL LIMIT 1`, [payload.memberId]);
        if (!memberRows.length)
            throw new common_1.NotFoundException('Member not found');
        const member = memberRows[0];
        const recordRows = await this.db.query(`SELECT id, check_out_time FROM attendance.records
       WHERE session_id = $1 AND member_id = $2`, [dto.sessionId, member.id]);
        if (!recordRows.length)
            throw new common_1.NotFoundException('No check-in record found for this member in this session');
        if (recordRows[0].check_out_time)
            throw new common_1.ConflictException(`${member.full_name} has already clocked out`);
        const result = await this.db.query(`UPDATE attendance.records SET check_out_time = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING check_out_time`, [recordRows[0].id]);
        return { memberName: member.full_name, checkOutTime: result[0].check_out_time };
    }
    async clockOutByFace(sessionId, photoBuffer) {
        const allDescriptors = await this.membersService.getAllFaceDescriptors();
        if (!allDescriptors.length)
            throw new common_1.BadRequestException('No face profiles registered');
        const queryDescriptor = await this.faceService.extractDescriptor(photoBuffer);
        if (!queryDescriptor)
            throw new common_1.BadRequestException('No face detected in photo');
        const bestMatch = this.faceService.findClosestMatch(queryDescriptor, allDescriptors);
        if (!bestMatch)
            throw new common_1.NotFoundException('Face not recognised');
        const memberRows = await this.db.query(`SELECT id, full_name FROM core.members WHERE id = $1`, [bestMatch.id]);
        const member = memberRows[0];
        const recordRows = await this.db.query(`SELECT id, check_out_time FROM attendance.records
       WHERE session_id = $1 AND member_id = $2`, [sessionId, member.id]);
        if (!recordRows.length)
            throw new common_1.NotFoundException('No check-in record found for this member in this session');
        if (recordRows[0].check_out_time)
            throw new common_1.ConflictException(`${member.full_name} has already clocked out`);
        const result = await this.db.query(`UPDATE attendance.records SET check_out_time = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING check_out_time`, [recordRows[0].id]);
        return {
            memberName: member.full_name,
            checkOutTime: result[0].check_out_time,
            confidence: Math.round((1 - bestMatch.distance / 0.5) * 100),
        };
    }
    async exportSessionExcel(sessionId) {
        const session = await this.getSession(sessionId);
        const records = await this.db.query(`SELECT ar.attendance_status, ar.check_in_time, ar.check_in_method,
              ar.check_out_time,
              m.member_id AS member_code, m.full_name, m.instrument, m.mobile_number
       FROM attendance.records ar
       JOIN core.members m ON m.id = ar.member_id
       WHERE ar.session_id = $1
       ORDER BY ar.check_in_time ASC NULLS LAST, m.full_name ASC`, [sessionId]);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Avishkar DHTP System';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Session Attendance', {
            pageSetup: { paperSize: 9, orientation: 'landscape' },
        });
        sheet.columns = [
            { header: 'Member ID', key: 'member_code', width: 18 },
            { header: 'Full Name', key: 'full_name', width: 26 },
            { header: 'Instrument', key: 'instrument', width: 14 },
            { header: 'Mobile', key: 'mobile_number', width: 16 },
            { header: 'Status', key: 'attendance_status', width: 12 },
            { header: 'Check-In', key: 'check_in_time', width: 22 },
            { header: 'Check-Out', key: 'check_out_time', width: 22 },
            { header: 'Duration', key: 'duration', width: 14 },
            { header: 'Method', key: 'check_in_method', width: 14 },
        ];
        sheet.getRow(1).eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8A0112' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        sheet.getRow(1).height = 24;
        records.forEach((row, i) => {
            const checkIn = row.check_in_time ? new Date(row.check_in_time) : null;
            const checkOut = row.check_out_time ? new Date(row.check_out_time) : null;
            let duration = '—';
            if (checkIn && checkOut) {
                const mins = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
                duration = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
            }
            const r = sheet.addRow({
                member_code: row.member_code,
                full_name: row.full_name,
                instrument: row.instrument ? (row.instrument.charAt(0).toUpperCase() + row.instrument.slice(1)) : '—',
                mobile_number: row.mobile_number,
                attendance_status: row.attendance_status?.toUpperCase(),
                check_in_time: checkIn ? checkIn.toLocaleString('en-IN') : '—',
                check_out_time: checkOut ? checkOut.toLocaleString('en-IN') : '—',
                duration,
                check_in_method: row.check_in_method ?? '—',
            });
            if (i % 2 === 1) {
                r.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F1' } };
                });
            }
        });
        return (await workbook.xlsx.writeBuffer());
    }
    async logScan(dto, memberId, adminId, success, reason) {
        await this.db.query(`INSERT INTO attendance.qr_scan_logs
        (session_id, raw_qr_payload, resolved_member, scanned_by,
         success, failure_reason, latitude, longitude, device_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
            dto.sessionId, dto.qrPayload, memberId, adminId,
            success, reason,
            dto.latitude ?? null, dto.longitude ?? null, dto.deviceName ?? null,
        ]);
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = AttendanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        members_service_1.MembersService,
        face_service_1.FaceService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map