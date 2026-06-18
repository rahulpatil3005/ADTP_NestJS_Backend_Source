import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import {
  LoginDto, TokenResponseDto, RefreshTokenDto,
  RequestOtpDto, VerifyOtpDto, ChangePasswordDto,
} from './dto/auth.dto';
import { JwtPayload, AuthenticatedUser } from './auth.types';
import { hashToken, generateSecureToken } from '../../common/utils/crypto.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly jwtService: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  // ── Email + Password Login ───────────────────────────────

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    try {
    const user = await this.db.query(
      `SELECT id, email, password_hash, role, is_active, failed_login_count, locked_until
       FROM auth.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [dto.email],
    );

    if (!user.length) throw new UnauthorizedException('Invalid credentials');
    const u = user[0];

    // Check lock
    if (u.locked_until && new Date(u.locked_until) > new Date()) {
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, u.password_hash);

    if (!passwordMatch) {
      await this.incrementFailedLogins(u.id, u.failed_login_count);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!u.is_active) throw new UnauthorizedException('Account deactivated');

    // Reset failed count
    await this.db.query(
      `UPDATE auth.users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW()
       WHERE id = $1`,
      [u.id],
    );

    return this.generateTokens(u.id, u.email, u.role);
    } catch (err: any) {
      this.logger.error('Login error', err?.message, err?.stack);
      throw err;
    }
  }

  // ── OTP Request ─────────────────────────────────────────

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string }> {
    const otp = Math.floor(100_000 + Math.random() * 900_000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    if (dto.phone) {
      await this.db.query(
        `UPDATE auth.users SET otp_secret = $1, otp_expires_at = $2
         WHERE phone = $3 AND deleted_at IS NULL`,
        [await bcrypt.hash(otp, 10), expiresAt, dto.phone],
      );
      // TODO: Send via SMS gateway (Twilio / MSG91)
    } else if (dto.email) {
      await this.db.query(
        `UPDATE auth.users SET otp_secret = $1, otp_expires_at = $2
         WHERE email = $3 AND deleted_at IS NULL`,
        [await bcrypt.hash(otp, 10), expiresAt, dto.email],
      );
      // TODO: Send via email (SendGrid / Nodemailer)
    }

    // In production, never return OTP in response
    return { message: 'OTP sent successfully' };
  }

  // ── OTP Verify & Login ───────────────────────────────────

  async verifyOtp(dto: VerifyOtpDto): Promise<TokenResponseDto> {
    const result = await this.db.query(
      `SELECT id, email, role, otp_secret, otp_expires_at, is_active
       FROM auth.users WHERE phone = $1 AND deleted_at IS NULL LIMIT 1`,
      [dto.phone],
    );
    if (!result.length) throw new UnauthorizedException('User not found');
    const u = result[0];
    if (!u.otp_secret || new Date(u.otp_expires_at) < new Date())
      throw new UnauthorizedException('OTP expired');
    const match = await bcrypt.compare(dto.otp, u.otp_secret);
    if (!match) throw new UnauthorizedException('Invalid OTP');

    await this.db.query(
      `UPDATE auth.users SET otp_secret = NULL, otp_expires_at = NULL,
       is_phone_verified = true, last_login_at = NOW() WHERE id = $1`,
      [u.id],
    );
    return this.generateTokens(u.id, u.email, u.role);
  }

  // ── Refresh Token ────────────────────────────────────────

  async refreshTokens(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.cfg.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const result = await this.db.query(
      `SELECT id, email, role, refresh_token_hash, is_active
       FROM auth.users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [payload.sub],
    );
    if (!result.length || !result[0].is_active)
      throw new UnauthorizedException();

    const tokenHash = hashToken(dto.refreshToken);
    if (result[0].refresh_token_hash !== tokenHash)
      throw new UnauthorizedException('Refresh token reuse detected');

    return this.generateTokens(result[0].id, result[0].email, result[0].role);
  }

  // ── Logout ───────────────────────────────────────────────

  async logout(userId: string): Promise<{ message: string }> {
    await this.db.query(
      `UPDATE auth.users SET refresh_token_hash = NULL WHERE id = $1`,
      [userId],
    );
    return { message: 'Logged out successfully' };
  }

  // ── Get current user profile ────────────────────────────

  async getMe(userId: string) {
    const rows = await this.db.query(
      `SELECT u.id, u.email, u.phone, u.role, u.is_active,
              COALESCE(a.full_name, m.full_name) AS full_name
       FROM auth.users u
       LEFT JOIN core.admins a ON a.user_id = u.id
       LEFT JOIN core.members m ON m.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    if (!rows.length) throw new Error('User not found');
    return { data: rows[0] };
  }

  // ── Change Password ──────────────────────────────────────

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const result = await this.db.query(
      `SELECT password_hash FROM auth.users WHERE id = $1`, [userId],
    );
    const match = await bcrypt.compare(dto.currentPassword, result[0].password_hash);
    if (!match) throw new BadRequestException('Current password is incorrect');
    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.db.query(
      `UPDATE auth.users SET password_hash = $1, refresh_token_hash = NULL WHERE id = $2`,
      [newHash, userId],
    );
    return { message: 'Password changed successfully' };
  }

  // ── Internals ────────────────────────────────────────────

  private async generateTokens(
    userId: string, email: string, role: string,
  ): Promise<TokenResponseDto> {
    const payload: JwtPayload = { sub: userId, email, role: role as any };
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

    await this.db.query(
      `UPDATE auth.users SET refresh_token_hash = $1 WHERE id = $2`,
      [hashToken(refreshToken), userId],
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 8 * 3600,
      role: role as any,
      userId,
    };
  }

  private async incrementFailedLogins(userId: string, current: number) {
    const max = Number(this.cfg.get('MAX_FAILED_LOGINS', '5'));
    const newCount = current + 1;
    const lockUntil = newCount >= max
      ? new Date(Date.now() + 30 * 60 * 1000)
      : null;
    await this.db.query(
      `UPDATE auth.users SET failed_login_count = $1, locked_until = $2 WHERE id = $3`,
      [newCount, lockUntil, userId],
    );
  }
}
