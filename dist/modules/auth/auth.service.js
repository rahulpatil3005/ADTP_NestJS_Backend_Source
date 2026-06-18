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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const config_1 = require("@nestjs/config");
const crypto_util_1 = require("../../common/utils/crypto.util");
let AuthService = AuthService_1 = class AuthService {
    constructor(db, jwtService, cfg) {
        this.db = db;
        this.jwtService = jwtService;
        this.cfg = cfg;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async login(dto) {
        try {
            const user = await this.db.query(`SELECT id, email, password_hash, role, is_active, failed_login_count, locked_until
       FROM auth.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`, [dto.email]);
            if (!user.length)
                throw new common_1.UnauthorizedException('Invalid credentials');
            const u = user[0];
            if (u.locked_until && new Date(u.locked_until) > new Date()) {
                throw new common_1.UnauthorizedException('Account temporarily locked. Try again later.');
            }
            const passwordMatch = await bcrypt.compare(dto.password, u.password_hash);
            if (!passwordMatch) {
                await this.incrementFailedLogins(u.id, u.failed_login_count);
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            if (!u.is_active)
                throw new common_1.UnauthorizedException('Account deactivated');
            await this.db.query(`UPDATE auth.users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW()
       WHERE id = $1`, [u.id]);
            return this.generateTokens(u.id, u.email, u.role);
        }
        catch (err) {
            this.logger.error('Login error', err?.message, err?.stack);
            throw err;
        }
    }
    async requestOtp(dto) {
        const otp = Math.floor(100_000 + Math.random() * 900_000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        if (dto.phone) {
            await this.db.query(`UPDATE auth.users SET otp_secret = $1, otp_expires_at = $2
         WHERE phone = $3 AND deleted_at IS NULL`, [await bcrypt.hash(otp, 10), expiresAt, dto.phone]);
        }
        else if (dto.email) {
            await this.db.query(`UPDATE auth.users SET otp_secret = $1, otp_expires_at = $2
         WHERE email = $3 AND deleted_at IS NULL`, [await bcrypt.hash(otp, 10), expiresAt, dto.email]);
        }
        return { message: 'OTP sent successfully' };
    }
    async verifyOtp(dto) {
        const result = await this.db.query(`SELECT id, email, role, otp_secret, otp_expires_at, is_active
       FROM auth.users WHERE phone = $1 AND deleted_at IS NULL LIMIT 1`, [dto.phone]);
        if (!result.length)
            throw new common_1.UnauthorizedException('User not found');
        const u = result[0];
        if (!u.otp_secret || new Date(u.otp_expires_at) < new Date())
            throw new common_1.UnauthorizedException('OTP expired');
        const match = await bcrypt.compare(dto.otp, u.otp_secret);
        if (!match)
            throw new common_1.UnauthorizedException('Invalid OTP');
        await this.db.query(`UPDATE auth.users SET otp_secret = NULL, otp_expires_at = NULL,
       is_phone_verified = true, last_login_at = NOW() WHERE id = $1`, [u.id]);
        return this.generateTokens(u.id, u.email, u.role);
    }
    async refreshTokens(dto) {
        let payload;
        try {
            payload = this.jwtService.verify(dto.refreshToken, {
                secret: this.cfg.getOrThrow('JWT_REFRESH_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const result = await this.db.query(`SELECT id, email, role, refresh_token_hash, is_active
       FROM auth.users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, [payload.sub]);
        if (!result.length || !result[0].is_active)
            throw new common_1.UnauthorizedException();
        const tokenHash = (0, crypto_util_1.hashToken)(dto.refreshToken);
        if (result[0].refresh_token_hash !== tokenHash)
            throw new common_1.UnauthorizedException('Refresh token reuse detected');
        return this.generateTokens(result[0].id, result[0].email, result[0].role);
    }
    async logout(userId) {
        await this.db.query(`UPDATE auth.users SET refresh_token_hash = NULL WHERE id = $1`, [userId]);
        return { message: 'Logged out successfully' };
    }
    async changePassword(userId, dto) {
        const result = await this.db.query(`SELECT password_hash FROM auth.users WHERE id = $1`, [userId]);
        const match = await bcrypt.compare(dto.currentPassword, result[0].password_hash);
        if (!match)
            throw new common_1.BadRequestException('Current password is incorrect');
        const newHash = await bcrypt.hash(dto.newPassword, 12);
        await this.db.query(`UPDATE auth.users SET password_hash = $1, refresh_token_hash = NULL WHERE id = $2`, [newHash, userId]);
        return { message: 'Password changed successfully' };
    }
    async generateTokens(userId, email, role) {
        const payload = { sub: userId, email, role: role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.cfg.getOrThrow('JWT_SECRET'),
                expiresIn: this.cfg.get('JWT_EXPIRES_IN', '8h'),
            }),
            this.jwtService.signAsync(payload, {
                secret: this.cfg.getOrThrow('JWT_REFRESH_SECRET'),
                expiresIn: this.cfg.get('JWT_REFRESH_EXPIRES_IN', '30d'),
            }),
        ]);
        await this.db.query(`UPDATE auth.users SET refresh_token_hash = $1 WHERE id = $2`, [(0, crypto_util_1.hashToken)(refreshToken), userId]);
        return {
            accessToken,
            refreshToken,
            expiresIn: 8 * 3600,
            role: role,
            userId,
        };
    }
    async incrementFailedLogins(userId, current) {
        const max = Number(this.cfg.get('MAX_FAILED_LOGINS', '5'));
        const newCount = current + 1;
        const lockUntil = newCount >= max
            ? new Date(Date.now() + 30 * 60 * 1000)
            : null;
        await this.db.query(`UPDATE auth.users SET failed_login_count = $1, locked_until = $2 WHERE id = $3`, [newCount, lockUntil, userId]);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map