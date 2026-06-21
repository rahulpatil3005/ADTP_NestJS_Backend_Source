import {
  IsString, IsEmail, IsOptional, IsEnum, IsBoolean,
  IsDateString, IsMobilePhone, MaxLength, IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum GenderType { MALE = 'male', FEMALE = 'female', OTHER = 'other' }

export enum CurrentStatus {
  SCHOOL_STUDENT = 'school_student',
  COLLEGE_STUDENT = 'college_student',
  WORKING_PROFESSIONAL = 'working_professional',
  BUSINESS = 'business',
  OTHER = 'other',
}

export enum InstrumentType {
  DHOL = 'dhol',
  TASHA = 'tasha',
  TOOL = 'tool',
  DHWAJ = 'dhwaj',
  ZANJ = 'zanj',
  SUPPORT = 'support',
}

export enum AvailabilityType {
  DAILY = 'daily',
  TWO_DAYS_WEEK = 'two_days_week',
  THREE_DAYS_WEEK = 'three_days_week',
  OTHER = 'other',
}

export class CreateMemberDto {
  // Personal Information
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) fullName: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiProperty() @IsMobilePhone('en-IN') mobileNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsMobilePhone('en-IN') alternateMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(GenderType) gender?: GenderType;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) address?: string;

  // Sensitive — encrypted at service layer
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(20) aadhaarNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) panNumber?: string;

  // Current Status
  @ApiPropertyOptional({ enum: CurrentStatus }) @IsOptional() @IsEnum(CurrentStatus) currentStatus?: CurrentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) currentStatusOrg?: string;

  // Parents (mandatory)
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) parentsName: string;
  @ApiProperty() @IsMobilePhone('en-IN') parentsContact: string;

  // Pathak Info
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasPriorPathakExp?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) priorPathakName?: string;

  @ApiProperty({ enum: InstrumentType }) @IsEnum(InstrumentType) instrument: InstrumentType;

  @ApiPropertyOptional({ enum: AvailabilityType }) @IsOptional() @IsEnum(AvailabilityType) availability?: AvailabilityType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) availabilityOther?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() joiningReason?: string;

  // Health
  @ApiPropertyOptional() @IsOptional() @IsString() healthDetails?: string;

  // Declaration
  @ApiPropertyOptional() @IsOptional() @IsString() digitalSignature?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() declarationAccepted?: boolean;
}

export class UpdateMemberDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsMobilePhone('en-IN') mobileNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(GenderType) gender?: GenderType;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(CurrentStatus) currentStatus?: CurrentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() currentStatusOrg?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentsName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentsContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(InstrumentType) instrument?: InstrumentType;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AvailabilityType) availability?: AvailabilityType;
  @ApiPropertyOptional() @IsOptional() @IsString() availabilityOther?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() joiningReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() healthDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class MemberSearchDto {
  @ApiPropertyOptional() @IsOptional() @IsString() query?: string;
  @ApiPropertyOptional({ enum: InstrumentType }) @IsOptional() @IsEnum(InstrumentType) instrument?: InstrumentType;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}
