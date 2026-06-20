import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as JSZip from 'jszip';
import { generateMemberQr, renderQrFromToken } from '../../common/utils/qr.util';

@Injectable()
export class QrService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async generateForMember(memberId: string) {
    const rows = await this.db.query(
      `SELECT id, member_id, full_name FROM core.members
       WHERE id = $1 AND deleted_at IS NULL`, [memberId],
    );
    if (!rows.length) throw new NotFoundException('Member not found');
    const member = rows[0];

    const qr = await generateMemberQr(member.member_id);

    await this.db.query(
      `UPDATE core.members
       SET qr_token = $1, qr_generated_at = NOW(), qr_last_rotated_at = NOW()
       WHERE id = $2`,
      [qr.encryptedToken, memberId],
    );

    return {
      memberId: member.member_id,
      fullName: member.full_name,
      qrDataUrl: qr.qrDataUrl,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateBulk(memberIds: string[]) {
    const results = await Promise.allSettled(
      memberIds.map((id) => this.generateForMember(id)),
    );
    return results.map((r, i) => ({
      memberId: memberIds[i],
      success: r.status === 'fulfilled',
      data: r.status === 'fulfilled' ? r.value : null,
      error: r.status === 'rejected' ? r.reason?.message : null,
    }));
  }

  async downloadAllQrZip(): Promise<Buffer> {
    const members = await this.db.query(
      `SELECT id, member_id, full_name, qr_token
       FROM core.members
       WHERE deleted_at IS NULL AND status = 'active'
       ORDER BY member_id`,
    );

    const zip = new JSZip();

    for (const member of members) {
      let qrDataUrl: string;
      if (member.qr_token) {
        qrDataUrl = await renderQrFromToken(member.member_id, member.qr_token);
      } else {
        const result = await this.generateForMember(member.id);
        qrDataUrl = result.qrDataUrl;
      }
      const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      const safeName = (member.full_name as string)
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      zip.file(`${member.member_id}_${safeName}.png`, buf);
    }

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }) as Promise<Buffer>;
  }

  async getQrForMember(memberId: string) {
    const rows = await this.db.query(
      `SELECT id, member_id, full_name, qr_token, qr_generated_at
       FROM core.members WHERE id = $1 AND deleted_at IS NULL`, [memberId],
    );
    if (!rows.length) throw new NotFoundException('Member not found');
    if (!rows[0].qr_token) {
      return this.generateForMember(memberId);
    }
    // Re-render QR image using the EXISTING stored token (not a new one)
    const qrDataUrl = await renderQrFromToken(rows[0].member_id, rows[0].qr_token);
    return {
      memberId: rows[0].member_id,
      fullName: rows[0].full_name,
      qrDataUrl,
      generatedAt: rows[0].qr_generated_at,
    };
  }
}
