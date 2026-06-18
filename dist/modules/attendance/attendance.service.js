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
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const attendance_dto_1 = require("./dto/attendance.dto");
const qr_util_1 = require("../../common/utils/qr.util");
let AttendanceService = AttendanceService_1 = class AttendanceService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(AttendanceService_1.name);
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
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map