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
exports.AdminsService = exports.UpdateAdminDto = exports.CreateAdminDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateAdminDto {
}
exports.CreateAdminDto = CreateAdminDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateAdminDto.prototype, "permissions", void 0);
class UpdateAdminDto {
}
exports.UpdateAdminDto = UpdateAdminDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdminDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateAdminDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAdminDto.prototype, "phone", void 0);
let AdminsService = class AdminsService {
    constructor(db) {
        this.db = db;
    }
    async create(dto, createdBy) {
        const existing = await this.db.query(`SELECT id FROM auth.users WHERE email = $1`, [dto.email]);
        if (existing.length)
            throw new common_1.ConflictException('Email already in use');
        const hash = await bcrypt.hash(dto.password, 12);
        const userResult = await this.db.query(`INSERT INTO auth.users (email, phone, password_hash, role, is_email_verified)
       VALUES ($1,$2,$3,'admin',true) RETURNING id`, [dto.email, dto.phone ?? null, hash]);
        const userId = userResult[0].id;
        const adminResult = await this.db.query(`INSERT INTO core.admins (user_id, full_name, permissions, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`, [userId, dto.fullName, JSON.stringify(dto.permissions ?? {}), createdBy]);
        return adminResult[0];
    }
    async findAll() {
        return this.db.query(`SELECT a.*, u.email, u.phone, u.is_active, u.last_login_at
       FROM core.admins a JOIN auth.users u ON u.id = a.user_id
       ORDER BY a.created_at DESC`);
    }
    async findOne(id) {
        const rows = await this.db.query(`SELECT a.*, u.email, u.phone, u.is_active, u.last_login_at, u.failed_login_count
       FROM core.admins a JOIN auth.users u ON u.id = a.user_id
       WHERE a.id = $1`, [id]);
        if (!rows.length)
            throw new common_1.NotFoundException('Admin not found');
        return rows[0];
    }
    async update(id, dto) {
        const admin = await this.findOne(id);
        if (dto.fullName) {
            await this.db.query(`UPDATE core.admins SET full_name = $1, updated_at = NOW() WHERE id = $2`, [dto.fullName, id]);
        }
        if (dto.email || dto.phone !== undefined) {
            if (dto.email && dto.email !== admin.email) {
                const exists = await this.db.query(`SELECT id FROM auth.users WHERE email = $1 AND id != $2`, [dto.email, admin.user_id]);
                if (exists.length)
                    throw new common_1.ConflictException('Email already in use');
            }
            const fields = [];
            const params = [];
            let idx = 1;
            if (dto.email) {
                fields.push(`email = $${idx++}`);
                params.push(dto.email);
            }
            if (dto.phone !== undefined) {
                fields.push(`phone = $${idx++}`);
                params.push(dto.phone || null);
            }
            if (fields.length) {
                params.push(admin.user_id);
                await this.db.query(`UPDATE auth.users SET ${fields.join(', ')} WHERE id = $${idx}`, params);
            }
        }
        return this.findOne(id);
    }
    async updatePermissions(id, permissions) {
        await this.db.query(`UPDATE core.admins SET permissions = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(permissions), id]);
        return this.findOne(id);
    }
    async toggleActive(id, active) {
        const admin = await this.findOne(id);
        await this.db.query(`UPDATE auth.users SET is_active = $1 WHERE id = $2`, [active, admin.user_id]);
        return { message: `Admin ${active ? 'activated' : 'deactivated'}` };
    }
    async resetPassword(id, newPassword) {
        const admin = await this.findOne(id);
        const hash = await bcrypt.hash(newPassword, 12);
        await this.db.query(`UPDATE auth.users SET password_hash = $1, failed_login_count = 0,
       locked_until = NULL WHERE id = $2`, [hash, admin.user_id]);
        return { message: 'Password reset successfully' };
    }
    async remove(id) {
        const admin = await this.findOne(id);
        await this.db.query(`DELETE FROM core.admins WHERE id = $1`, [id]);
        await this.db.query(`DELETE FROM auth.users WHERE id = $1`, [admin.user_id]);
        return { message: 'Admin deleted' };
    }
};
exports.AdminsService = AdminsService;
exports.AdminsService = AdminsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], AdminsService);
//# sourceMappingURL=admins.service.js.map