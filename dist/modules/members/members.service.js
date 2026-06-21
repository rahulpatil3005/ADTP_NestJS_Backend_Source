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
var MembersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_util_1 = require("../../common/utils/crypto.util");
const qr_util_1 = require("../../common/utils/qr.util");
const whatsapp_service_1 = require("../../common/services/whatsapp.service");
const settings_service_1 = require("../settings/settings.service");
const face_service_1 = require("./face.service");
let MembersService = MembersService_1 = class MembersService {
    constructor(db, whatsapp, settings, faceService) {
        this.db = db;
        this.whatsapp = whatsapp;
        this.settings = settings;
        this.faceService = faceService;
        this.logger = new common_1.Logger(MembersService_1.name);
    }
    async create(dto, userId) {
        const existing = await this.db.query(`SELECT id FROM core.members WHERE mobile_number = $1 AND deleted_at IS NULL`, [dto.mobileNumber]);
        if (existing.length)
            throw new common_1.ConflictException('Mobile number already registered');
        const adminRows = await this.db.query(`SELECT id FROM core.admins WHERE user_id = $1 LIMIT 1`, [userId]);
        const adminId = adminRows[0]?.id ?? null;
        const aadhaarEncrypted = dto.aadhaarNumber ? (0, crypto_util_1.encrypt)(dto.aadhaarNumber) : null;
        const panEncrypted = dto.panNumber ? (0, crypto_util_1.encrypt)(dto.panNumber) : null;
        let result;
        try {
            result = await this.db.query(`INSERT INTO core.members (
        full_name, date_of_birth, mobile_number, alternate_mobile, gender,
        email, address, aadhaar_number, pan_number, current_status, current_status_org,
        parents_name, parents_contact,
        has_prior_pathak_exp, prior_pathak_name,
        instrument, availability, availability_other, joining_reason,
        health_notes,
        digital_signature, declaration_accepted, declaration_date,
        status, approved_by, approved_at, joining_date
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,CURRENT_DATE,'active',$23,NOW(),CURRENT_DATE
      ) RETURNING id, member_id`, [
                dto.fullName, dto.dateOfBirth ?? null, dto.mobileNumber, dto.alternateMobile ?? null,
                dto.gender ?? null, dto.email ?? null, dto.address ?? null,
                aadhaarEncrypted, panEncrypted, dto.currentStatus ?? null, dto.currentStatusOrg ?? null,
                dto.parentsName, dto.parentsContact,
                dto.hasPriorPathakExp ?? false, dto.priorPathakName ?? null,
                dto.instrument, dto.availability ?? null, dto.availabilityOther ?? null, dto.joiningReason ?? null,
                dto.healthDetails ?? null,
                dto.digitalSignature ?? null, dto.declarationAccepted ?? false,
                adminId,
            ]);
        }
        catch (err) {
            this.logger.error('Member INSERT failed', err?.message, err?.stack);
            throw new common_1.InternalServerErrorException(err?.message ?? 'Database error during member creation');
        }
        const member = result[0];
        const qr = await (0, qr_util_1.generateMemberQr)(member.member_id);
        await this.db.query(`UPDATE core.members SET qr_token = $1, qr_generated_at = NOW() WHERE id = $2`, [qr.encryptedToken, member.id]);
        this.settings.getBool('notifications.whatsapp_qr_on_registration', false).then((enabled) => {
            if (enabled) {
                this.whatsapp.sendMemberWelcome({
                    to: dto.mobileNumber,
                    fullName: dto.fullName,
                    memberId: member.member_id,
                    instrument: dto.instrument,
                    encryptedToken: qr.encryptedToken,
                });
            }
        });
        return { ...member, qrDataUrl: qr.qrDataUrl };
    }
    async findAll(search) {
        const page = Math.max(1, Number(search.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(search.limit ?? 20)));
        const offset = (page - 1) * limit;
        const conditions = ['m.deleted_at IS NULL'];
        const params = [];
        let idx = 1;
        if (search.query) {
            conditions.push(`(m.full_name ILIKE $${idx} OR m.member_id ILIKE $${idx} OR m.mobile_number = $${idx})`);
            params.push(`%${search.query}%`);
            idx++;
        }
        if (search.instrument) {
            conditions.push(`m.instrument = $${idx}`);
            params.push(search.instrument);
            idx++;
        }
        if (search.status) {
            conditions.push(`m.status = $${idx}`);
            params.push(search.status);
            idx++;
        }
        const where = conditions.join(' AND ');
        const [rows, count] = await Promise.all([
            this.db.query(`SELECT m.id, m.member_id, m.full_name, m.mobile_number, m.email,
                m.gender, m.instrument, m.availability, m.status,
                m.joining_date, m.photo_url, m.qr_generated_at
         FROM core.members m WHERE ${where}
         ORDER BY m.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
            this.db.query(`SELECT COUNT(*) FROM core.members m WHERE ${where}`, params),
        ]);
        return {
            data: rows,
            total: Number(count[0].count),
            page, limit,
            totalPages: Math.ceil(Number(count[0].count) / limit),
        };
    }
    async findOne(id) {
        const rows = await this.db.query(`SELECT m.*, a.full_name AS approved_by_name
       FROM core.members m
       LEFT JOIN core.admins a ON a.id = m.approved_by
       WHERE m.id = $1 AND m.deleted_at IS NULL`, [id]);
        if (!rows.length)
            throw new common_1.NotFoundException('Member not found');
        const m = rows[0];
        if (m.aadhaar_number)
            m.aadhaar_number = (0, crypto_util_1.decrypt)(m.aadhaar_number);
        if (m.pan_number)
            m.pan_number = (0, crypto_util_1.decrypt)(m.pan_number);
        return m;
    }
    async update(id, dto) {
        const member = await this.findOne(id);
        const sets = [];
        const params = [];
        let idx = 1;
        const fieldMap = {
            fullName: 'full_name', dateOfBirth: 'date_of_birth',
            mobileNumber: 'mobile_number', gender: 'gender', email: 'email',
            address: 'address', currentStatus: 'current_status', currentStatusOrg: 'current_status_org',
            parentsName: 'parents_name', parentsContact: 'parents_contact',
            guardianName: 'guardian_name', guardianContact: 'guardian_contact',
            instrument: 'instrument', availability: 'availability', availabilityOther: 'availability_other',
            joiningReason: 'joining_reason', healthDetails: 'health_notes',
            status: 'status',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (dto[key] !== undefined) {
                sets.push(`${col} = $${idx}`);
                params.push(dto[key]);
                idx++;
            }
        }
        if (!sets.length)
            return member;
        sets.push(`updated_at = NOW()`);
        params.push(id);
        await this.db.query(`UPDATE core.members SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.db.query(`UPDATE core.members SET deleted_at = NOW(), status = 'inactive' WHERE id = $1`, [id]);
        return { message: 'Member deactivated successfully' };
    }
    async getAttendanceSummary(id) {
        await this.findOne(id);
        const rows = await this.db.query(`SELECT * FROM core.member_attendance_summary WHERE member_id = $1`, [id]);
        return rows[0] ?? {};
    }
    async bulkImport(members, adminId) {
        const results = { success: 0, failed: 0, errors: [] };
        for (const dto of members) {
            try {
                await this.create(dto, adminId);
                results.success++;
            }
            catch (e) {
                results.failed++;
                results.errors.push(`${dto.mobileNumber}: ${e.message}`);
            }
        }
        return results;
    }
    async uploadPhoto(id, file) {
        if (!file)
            throw new common_1.BadRequestException('No photo file provided');
        await this.findOne(id);
        const photoDataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        let faceDescriptor = null;
        if (this.faceService.isReady) {
            faceDescriptor = await this.faceService.extractDescriptor(file.buffer);
            if (!faceDescriptor) {
                this.logger.warn(`No face detected in uploaded photo for member ${id}`);
            }
        }
        await this.db.query(`UPDATE core.members
       SET photo_url = $1, face_descriptor = $2, updated_at = NOW()
       WHERE id = $3`, [photoDataUrl, faceDescriptor ? JSON.stringify(faceDescriptor) : null, id]);
        return {
            photoUrl: photoDataUrl,
            faceDetected: !!faceDescriptor,
            message: faceDescriptor
                ? 'Photo uploaded and face registered for attendance'
                : 'Photo uploaded (no face detected — re-upload a clear face photo for face scan)',
        };
    }
    async getAllFaceDescriptors() {
        const rows = await this.db.query(`SELECT id, face_descriptor FROM core.members
       WHERE face_descriptor IS NOT NULL AND deleted_at IS NULL AND status = 'active'`);
        return rows
            .filter((r) => r.face_descriptor)
            .map((r) => ({
            id: r.id,
            descriptor: typeof r.face_descriptor === 'string'
                ? JSON.parse(r.face_descriptor)
                : r.face_descriptor,
        }));
    }
};
exports.MembersService = MembersService;
exports.MembersService = MembersService = MembersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        whatsapp_service_1.WhatsAppService,
        settings_service_1.SettingsService,
        face_service_1.FaceService])
], MembersService);
//# sourceMappingURL=members.service.js.map