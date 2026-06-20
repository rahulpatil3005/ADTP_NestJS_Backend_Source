import {
  Injectable, NotFoundException, ConflictException, BadRequestException, Logger, InternalServerErrorException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import { CreateMemberDto, UpdateMemberDto, MemberSearchDto } from './dto/member.dto';
import { encrypt, decrypt } from '../../common/utils/crypto.util';
import { generateMemberQr } from '../../common/utils/qr.util';
import { WhatsAppService } from '../../common/services/whatsapp.service';
import { SettingsService } from '../settings/settings.service';
import { FaceService } from './face.service';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly whatsapp: WhatsAppService,
    private readonly settings: SettingsService,
    private readonly faceService: FaceService,
  ) {}

  // ── Register ─────────────────────────────────────────────

  async create(dto: CreateMemberDto, userId: string) {
    // Check duplicate mobile
    const existing = await this.db.query(
      `SELECT id FROM core.members WHERE mobile_number = $1 AND deleted_at IS NULL`,
      [dto.mobileNumber],
    );
    if (existing.length) throw new ConflictException('Mobile number already registered');

    // Resolve core.admins.id from auth.users.id
    const adminRows = await this.db.query(
      `SELECT id FROM core.admins WHERE user_id = $1 LIMIT 1`, [userId],
    );
    const adminId = adminRows[0]?.id ?? null;

    // Encrypt sensitive fields
    const aadhaarEncrypted = dto.aadhaarNumber ? encrypt(dto.aadhaarNumber) : null;
    const panEncrypted = dto.panNumber ? encrypt(dto.panNumber) : null;

    let result: any[];
    try {
      result = await this.db.query(
      `INSERT INTO core.members (
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
      ) RETURNING id, member_id`,
      [
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
    } catch (err: any) {
      this.logger.error('Member INSERT failed', err?.message, err?.stack);
      // Expose the DB error message in development so it's easy to diagnose
      throw new InternalServerErrorException(err?.message ?? 'Database error during member creation');
    }

    const member = result![0];

    // Generate QR immediately after registration
    const qr = await generateMemberQr(member.member_id);
    await this.db.query(
      `UPDATE core.members SET qr_token = $1, qr_generated_at = NOW() WHERE id = $2`,
      [qr.encryptedToken, member.id],
    );

    // Send WhatsApp welcome message with QR only if enabled in system config
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

  // ── Find All (paginated + filtered) ─────────────────────

  async findAll(search: MemberSearchDto) {
    const page = Math.max(1, Number(search.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(search.limit ?? 20)));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['m.deleted_at IS NULL'];
    const params: any[] = [];
    let idx = 1;

    if (search.query) {
      conditions.push(
        `(m.full_name ILIKE $${idx} OR m.member_id ILIKE $${idx} OR m.mobile_number = $${idx})`,
      );
      params.push(`%${search.query}%`);
      idx++;
    }
    if (search.instrument) {
      conditions.push(`m.instrument = $${idx}`);
      params.push(search.instrument); idx++;
    }
    if (search.status) {
      conditions.push(`m.status = $${idx}`);
      params.push(search.status); idx++;
    }

    const where = conditions.join(' AND ');

    const [rows, count] = await Promise.all([
      this.db.query(
        `SELECT m.id, m.member_id, m.full_name, m.mobile_number, m.email,
                m.gender, m.instrument, m.availability, m.status,
                m.joining_date, m.photo_url, m.qr_generated_at
         FROM core.members m WHERE ${where}
         ORDER BY m.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
      this.db.query(
        `SELECT COUNT(*) FROM core.members m WHERE ${where}`, params,
      ),
    ]);

    return {
      data: rows,
      total: Number(count[0].count),
      page, limit,
      totalPages: Math.ceil(Number(count[0].count) / limit),
    };
  }

  // ── Find One ─────────────────────────────────────────────

  async findOne(id: string) {
    const rows = await this.db.query(
      `SELECT m.*, a.full_name AS approved_by_name
       FROM core.members m
       LEFT JOIN core.admins a ON a.id = m.approved_by
       WHERE m.id = $1 AND m.deleted_at IS NULL`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('Member not found');
    const m = rows[0];
    // Decrypt sensitive fields for authorised view
    if (m.aadhaar_number) m.aadhaar_number = decrypt(m.aadhaar_number);
    if (m.pan_number) m.pan_number = decrypt(m.pan_number);
    return m;
  }

  // ── Update ───────────────────────────────────────────────

  async update(id: string, dto: UpdateMemberDto) {
    const member = await this.findOne(id);
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
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
      if ((dto as any)[key] !== undefined) {
        sets.push(`${col} = $${idx}`);
        params.push((dto as any)[key]);
        idx++;
      }
    }

    if (!sets.length) return member;

    sets.push(`updated_at = NOW()`);
    params.push(id);

    await this.db.query(
      `UPDATE core.members SET ${sets.join(', ')} WHERE id = $${idx}`,
      params,
    );
    return this.findOne(id);
  }

  // ── Soft Delete ──────────────────────────────────────────

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query(
      `UPDATE core.members SET deleted_at = NOW(), status = 'inactive' WHERE id = $1`, [id],
    );
    return { message: 'Member deactivated successfully' };
  }

  // ── Attendance Summary ───────────────────────────────────

  async getAttendanceSummary(id: string) {
    await this.findOne(id);
    const rows = await this.db.query(
      `SELECT * FROM core.member_attendance_summary WHERE member_id = $1`, [id],
    );
    return rows[0] ?? {};
  }

  // ── Bulk Import ──────────────────────────────────────────

  async bulkImport(members: CreateMemberDto[], adminId: string) {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    for (const dto of members) {
      try {
        await this.create(dto, adminId);
        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${dto.mobileNumber}: ${e.message}`);
      }
    }
    return results;
  }

  // ── Photo Upload + Face Descriptor ───────────────────────

  async uploadPhoto(id: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No photo file provided');
    await this.findOne(id);

    const photoUrl = `/uploads/photos/${file.filename}`;
    let faceDescriptor: number[] | null = null;

    if (this.faceService.isReady) {
      const buffer = fs.readFileSync(file.path);
      faceDescriptor = await this.faceService.extractDescriptor(buffer);
      if (!faceDescriptor) {
        this.logger.warn(`No face detected in uploaded photo for member ${id}`);
      }
    }

    await this.db.query(
      `UPDATE core.members
       SET photo_url = $1, face_descriptor = $2, updated_at = NOW()
       WHERE id = $3`,
      [photoUrl, faceDescriptor ? JSON.stringify(faceDescriptor) : null, id],
    );

    return {
      photoUrl,
      faceDetected: !!faceDescriptor,
      message: faceDescriptor
        ? 'Photo uploaded and face registered for attendance'
        : 'Photo uploaded (no face detected — re-upload a clear face photo for face scan)',
    };
  }

  // ── Get all members with face descriptors (for face-scan matching) ───

  async getAllFaceDescriptors(): Promise<Array<{ id: string; descriptor: number[] }>> {
    const rows = await this.db.query(
      `SELECT id, face_descriptor FROM core.members
       WHERE face_descriptor IS NOT NULL AND deleted_at IS NULL AND status = 'active'`,
    );
    return rows
      .filter((r: any) => r.face_descriptor)
      .map((r: any) => ({
        id: r.id,
        descriptor: typeof r.face_descriptor === 'string'
          ? JSON.parse(r.face_descriptor)
          : r.face_descriptor,
      }));
  }
}
