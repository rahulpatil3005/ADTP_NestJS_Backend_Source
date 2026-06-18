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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const qr_util_1 = require("../../common/utils/qr.util");
let QrService = class QrService {
    constructor(db) {
        this.db = db;
    }
    async generateForMember(memberId) {
        const rows = await this.db.query(`SELECT id, member_id, full_name FROM core.members
       WHERE id = $1 AND deleted_at IS NULL`, [memberId]);
        if (!rows.length)
            throw new common_1.NotFoundException('Member not found');
        const member = rows[0];
        const qr = await (0, qr_util_1.generateMemberQr)(member.member_id);
        await this.db.query(`UPDATE core.members
       SET qr_token = $1, qr_generated_at = NOW(), qr_last_rotated_at = NOW()
       WHERE id = $2`, [qr.encryptedToken, memberId]);
        return {
            memberId: member.member_id,
            fullName: member.full_name,
            qrDataUrl: qr.qrDataUrl,
            generatedAt: new Date().toISOString(),
        };
    }
    async generateBulk(memberIds) {
        const results = await Promise.allSettled(memberIds.map((id) => this.generateForMember(id)));
        return results.map((r, i) => ({
            memberId: memberIds[i],
            success: r.status === 'fulfilled',
            data: r.status === 'fulfilled' ? r.value : null,
            error: r.status === 'rejected' ? r.reason?.message : null,
        }));
    }
    async getQrForMember(memberId) {
        const rows = await this.db.query(`SELECT id, member_id, full_name, qr_token, qr_generated_at
       FROM core.members WHERE id = $1 AND deleted_at IS NULL`, [memberId]);
        if (!rows.length)
            throw new common_1.NotFoundException('Member not found');
        if (!rows[0].qr_token) {
            return this.generateForMember(memberId);
        }
        const qrDataUrl = await (0, qr_util_1.renderQrFromToken)(rows[0].member_id, rows[0].qr_token);
        return {
            memberId: rows[0].member_id,
            fullName: rows[0].full_name,
            qrDataUrl,
            generatedAt: rows[0].qr_generated_at,
        };
    }
};
exports.QrService = QrService;
exports.QrService = QrService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], QrService);
//# sourceMappingURL=qr.service.js.map