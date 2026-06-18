import {
  IsEmail, IsString, MinLength, MaxLength,
  IsEnum, IsOptional, IsMobilePhone, Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../auth.types';

// ── Login ────────────────────────────────────────────────────

export class LoginDto {
  @ApiProperty({ example: 'admin@avishkardhtp.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@ADTP2025' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginWithPhoneDto {
  @ApiProperty({ example: '+919876543210' })
  @IsMobilePhone('en-IN')
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;
}

// ── OTP ─────────────────────────────────────────────────────

export class RequestOtpDto {
  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsMobilePhone('en-IN')
  phone?: string;

  @ApiPropertyOptional({ example: 'member@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsMobilePhone('en-IN')
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;
}

// ── Token Response ───────────────────────────────────────────

export class TokenResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty() expiresIn: number;
  @ApiProperty({ enum: ['super_admin', 'admin', 'member'] }) role: UserRole;
  @ApiProperty() userId: string;
}

// ── Refresh ──────────────────────────────────────────────────

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

// ── Change Password ──────────────────────────────────────────

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  newPassword: string;
}
