// admins.service.ts
import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { IsString, IsEmail, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() fullName: string;
  @ApiProperty() @IsString() password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() permissions?: Record<string, boolean>;
}

export class UpdateAdminDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}

@Injectable()
export class AdminsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async create(dto: CreateAdminDto, createdBy: string) {
    const existing = await this.db.query(
      `SELECT id FROM auth.users WHERE email = $1`, [dto.email],
    );
    if (existing.length) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(dto.password, 12);
    const userResult = await this.db.query(
      `INSERT INTO auth.users (email, phone, password_hash, role, is_email_verified)
       VALUES ($1,$2,$3,'admin',true) RETURNING id`,
      [dto.email, dto.phone ?? null, hash],
    );
    const userId = userResult[0].id;

    const adminResult = await this.db.query(
      `INSERT INTO core.admins (user_id, full_name, permissions, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [userId, dto.fullName, JSON.stringify(dto.permissions ?? {}), createdBy],
    );
    return adminResult[0];
  }

  async findAll() {
    return this.db.query(
      `SELECT a.*, u.email, u.phone, u.is_active, u.last_login_at
       FROM core.admins a JOIN auth.users u ON u.id = a.user_id
       ORDER BY a.created_at DESC`,
    );
  }

  async findOne(id: string) {
    const rows = await this.db.query(
      `SELECT a.*, u.email, u.phone, u.is_active, u.last_login_at, u.failed_login_count
       FROM core.admins a JOIN auth.users u ON u.id = a.user_id
       WHERE a.id = $1`, [id],
    );
    if (!rows.length) throw new NotFoundException('Admin not found');
    return rows[0];
  }

  async update(id: string, dto: UpdateAdminDto) {
    const admin = await this.findOne(id);
    if (dto.fullName) {
      await this.db.query(
        `UPDATE core.admins SET full_name = $1, updated_at = NOW() WHERE id = $2`,
        [dto.fullName, id],
      );
    }
    if (dto.email || dto.phone !== undefined) {
      if (dto.email && dto.email !== admin.email) {
        const exists = await this.db.query(
          `SELECT id FROM auth.users WHERE email = $1 AND id != $2`, [dto.email, admin.user_id],
        );
        if (exists.length) throw new ConflictException('Email already in use');
      }
      const fields: string[] = [];
      const params: any[] = [];
      let idx = 1;
      if (dto.email) { fields.push(`email = $${idx++}`); params.push(dto.email); }
      if (dto.phone !== undefined) { fields.push(`phone = $${idx++}`); params.push(dto.phone || null); }
      if (fields.length) {
        params.push(admin.user_id);
        await this.db.query(
          `UPDATE auth.users SET ${fields.join(', ')} WHERE id = $${idx}`, params,
        );
      }
    }
    return this.findOne(id);
  }

  async updatePermissions(id: string, permissions: Record<string, boolean>) {
    await this.db.query(
      `UPDATE core.admins SET permissions = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(permissions), id],
    );
    return this.findOne(id);
  }

  async toggleActive(id: string, active: boolean) {
    const admin = await this.findOne(id);
    await this.db.query(
      `UPDATE auth.users SET is_active = $1 WHERE id = $2`, [active, admin.user_id],
    );
    return { message: `Admin ${active ? 'activated' : 'deactivated'}` };
  }

  async resetPassword(id: string, newPassword: string) {
    const admin = await this.findOne(id);
    const hash = await bcrypt.hash(newPassword, 12);
    await this.db.query(
      `UPDATE auth.users SET password_hash = $1, failed_login_count = 0,
       locked_until = NULL WHERE id = $2`,
      [hash, admin.user_id],
    );
    return { message: 'Password reset successfully' };
  }

  async remove(id: string) {
    const admin = await this.findOne(id);
    await this.db.query(`DELETE FROM core.admins WHERE id = $1`, [id]);
    await this.db.query(`DELETE FROM auth.users WHERE id = $1`, [admin.user_id]);
    return { message: 'Admin deleted' };
  }
}
