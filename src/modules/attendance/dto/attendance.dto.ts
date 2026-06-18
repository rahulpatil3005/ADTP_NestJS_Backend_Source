import {
  IsString, IsOptional, IsEnum, IsBoolean, IsDateString,
  IsNumber, IsUUID, IsNotEmpty, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SessionType {
  PRACTICE = 'practice', EVENT = 'event',
  WORKSHOP = 'workshop', REHEARSAL = 'rehearsal', OTHER = 'other',
}

export enum AttendanceStatus {
  PRESENT = 'present', ABSENT = 'absent',
  LATE = 'late', HALF_DAY = 'half_day', LEAVE = 'leave',
}

// ── Session ──────────────────────────────────────────────────

export class CreateSessionDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty({ enum: SessionType }) @IsEnum(SessionType) sessionType: SessionType;
  @ApiProperty({ example: '2025-06-16' }) @IsDateString() sessionDate: string;
  @ApiPropertyOptional({ example: '09:00' }) @IsOptional() @IsString() startTime?: string;
  @ApiPropertyOptional({ example: '11:00' }) @IsOptional() @IsString() endTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @ApiPropertyOptional({ default: 100 }) @IsOptional() @IsNumber() allowedRadiusMeters?: number;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isLocationRestricted?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ── QR Scan ──────────────────────────────────────────────────

export class QrScanDto {
  @ApiProperty({ description: 'Raw JSON string decoded from QR code' })
  @IsString()
  @IsNotEmpty()
  qrPayload: string;

  @ApiProperty() @IsUUID() sessionId: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() deviceName?: string;
}

// ── Manual Attendance ────────────────────────────────────────

export class MarkAttendanceDto {
  @ApiProperty() @IsUUID() sessionId: string;
  @ApiProperty() @IsUUID() memberId: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() overrideReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ── Report Filters ───────────────────────────────────────────

export class AttendanceFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() memberId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sessionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() toDate?: string;
  @ApiPropertyOptional({ enum: AttendanceStatus }) @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
  @ApiPropertyOptional({ enum: SessionType }) @IsOptional() @IsEnum(SessionType) sessionType?: SessionType;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}
