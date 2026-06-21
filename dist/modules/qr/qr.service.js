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
const path = require("path");
const JSZip = require("jszip");
const canvas_1 = require("canvas");
const qr_util_1 = require("../../common/utils/qr.util");
const FONTS_DIR = path.join(process.cwd(), 'assets', 'fonts');
try {
    (0, canvas_1.registerFont)(path.join(FONTS_DIR, 'NotoSans-Regular.ttf'), { family: 'NotoSans' });
    (0, canvas_1.registerFont)(path.join(FONTS_DIR, 'NotoSans-Bold.ttf'), { family: 'NotoSans', weight: 'bold' });
}
catch {
}
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
    roundRect(ctx, x, y, w, h, radii) {
        const [tl, tr, br, bl] = Array.isArray(radii)
            ? radii
            : [radii, radii, radii, radii];
        ctx.beginPath();
        ctx.moveTo(x + tl, y);
        ctx.lineTo(x + w - tr, y);
        ctx.arcTo(x + w, y, x + w, y + tr, tr);
        ctx.lineTo(x + w, y + h - br);
        ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
        ctx.lineTo(x + bl, y + h);
        ctx.arcTo(x, y + h, x, y + h - bl, bl);
        ctx.lineTo(x, y + tl);
        ctx.arcTo(x, y, x + tl, y, tl);
        ctx.closePath();
    }
    async renderMemberCard(fullName, memberId, instrument, qrDataUrl) {
        const W = 680, H = 1020, R = 32, SCALE = 2;
        const canvas = (0, canvas_1.createCanvas)(W * SCALE, H * SCALE);
        const ctx = canvas.getContext('2d');
        ctx.scale(SCALE, SCALE);
        ctx.fillStyle = '#FFFFFF';
        this.roundRect(ctx, 0, 0, W, H, R);
        ctx.fill();
        const headerH = 112;
        ctx.fillStyle = '#8A0112';
        this.roundRect(ctx, 0, 0, W, headerH, [R, R, 0, 0]);
        ctx.fill();
        const iconCX = 56, iconCY = 56, iconR = 28;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(iconCX, iconCY, iconR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(iconCX - 4, iconCY + 8, 7, 5, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(iconCX + 3, iconCY + 8);
        ctx.lineTo(iconCX + 3, iconCY - 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(iconCX + 3, iconCY - 10);
        ctx.bezierCurveTo(iconCX + 18, iconCY - 6, iconCX + 16, iconCY + 2, iconCX + 3, iconCY - 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '14px NotoSans';
        ctx.textAlign = 'left';
        ctx.fillText('AVISHKAR DHOL TASHA PATHAK', 98, 44);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px NotoSans';
        ctx.fillText('Member Card', 98, 76);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, headerH - 4, W, 4);
        const avatarR = 52;
        const avatarY = headerH + 80;
        ctx.fillStyle = '#FDEEF0';
        ctx.beginPath();
        ctx.arc(W / 2, avatarY, avatarR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F5C2C7';
        ctx.lineWidth = 2;
        ctx.stroke();
        const initials = fullName
            .split(' ')
            .map((n) => n[0] ?? '')
            .join('')
            .slice(0, 2)
            .toUpperCase();
        ctx.fillStyle = '#8A0112';
        ctx.font = 'bold 34px NotoSans';
        ctx.textAlign = 'center';
        ctx.fillText(initials, W / 2, avatarY + 12);
        const nameY = avatarY + avatarR + 36;
        ctx.fillStyle = '#1A1A2E';
        ctx.font = 'bold 30px NotoSans';
        ctx.textAlign = 'center';
        ctx.fillText(fullName, W / 2, nameY);
        const badge = instrument.charAt(0).toUpperCase() + instrument.slice(1);
        ctx.font = 'bold 15px NotoSans';
        const bW = ctx.measureText(badge).width + 40;
        const bH = 32;
        const bY = nameY + 20;
        ctx.fillStyle = '#FDEEF0';
        this.roundRect(ctx, W / 2 - bW / 2, bY, bW, bH, 16);
        ctx.fill();
        ctx.fillStyle = '#8A0112';
        ctx.fillText(badge, W / 2, bY + 22);
        const divY = bY + bH + 36;
        ctx.strokeStyle = '#E0DFD8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(60, divY);
        ctx.lineTo(W - 60, divY);
        ctx.stroke();
        const qrImg = await (0, canvas_1.loadImage)(qrDataUrl);
        const qrSize = 360;
        const qrX = (W - qrSize) / 2;
        const qrY = divY + 36;
        ctx.fillStyle = '#FAFAF7';
        ctx.strokeStyle = '#E0DFD8';
        ctx.lineWidth = 1;
        this.roundRect(ctx, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 20);
        ctx.fill();
        ctx.stroke();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        const idY = qrY + qrSize + 40;
        ctx.fillStyle = '#FDEEF0';
        this.roundRect(ctx, W / 2 - 140, idY, 280, 46, 12);
        ctx.fill();
        ctx.fillStyle = '#8A0112';
        ctx.font = 'bold 20px NotoSans';
        ctx.textAlign = 'center';
        ctx.fillText(memberId, W / 2, idY + 30);
        ctx.fillStyle = '#888888';
        ctx.font = '14px NotoSans';
        ctx.fillText('Scan this QR code to mark attendance', W / 2, idY + 72);
        ctx.fillText('Keep this card safe', W / 2, idY + 93);
        ctx.fillStyle = '#8A0112';
        this.roundRect(ctx, 0, H - 54, W, 54, [0, 0, R, R]);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '14px NotoSans';
        ctx.fillText('avishkardhtp.org', W / 2, H - 20);
        ctx.strokeStyle = '#E0DFD8';
        ctx.lineWidth = 2;
        this.roundRect(ctx, 1, 1, W - 2, H - 2, R);
        ctx.stroke();
        return canvas.toBuffer('image/png');
    }
    async downloadAllQrZip() {
        const members = await this.db.query(`SELECT id, member_id, full_name, instrument, qr_token
       FROM core.members
       WHERE deleted_at IS NULL AND status = 'active'
       ORDER BY member_id`);
        const zip = new JSZip();
        for (const member of members) {
            let qrDataUrl;
            if (member.qr_token) {
                qrDataUrl = await (0, qr_util_1.renderQrFromToken)(member.member_id, member.qr_token);
            }
            else {
                const result = await this.generateForMember(member.id);
                qrDataUrl = result.qrDataUrl;
            }
            const cardBuffer = await this.renderMemberCard(member.full_name, member.member_id, member.instrument ?? 'dhol', qrDataUrl);
            const safeName = member.full_name
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .trim()
                .replace(/\s+/g, '_');
            zip.file(`${member.member_id}_${safeName}.png`, cardBuffer);
        }
        return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
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