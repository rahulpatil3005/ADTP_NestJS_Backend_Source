import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as JSZip from 'jszip';
import { createCanvas, loadImage } from 'canvas';
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

  private roundRect(
    ctx: any, x: number, y: number, w: number, h: number,
    radii: number | [number, number, number, number],
  ) {
    const [tl, tr, br, bl] = Array.isArray(radii)
      ? radii
      : [radii, radii, radii, radii];
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.arcTo(x + w, y,       x + w, y + tr,     tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.arcTo(x + w, y + h,   x + w - br, y + h, br);
    ctx.lineTo(x + bl, y + h);
    ctx.arcTo(x,       y + h, x,     y + h - bl, bl);
    ctx.lineTo(x, y + tl);
    ctx.arcTo(x,       y,     x + tl, y,          tl);
    ctx.closePath();
  }

  private async renderMemberCard(
    fullName: string,
    memberId: string,
    instrument: string,
    qrDataUrl: string,
  ): Promise<Buffer> {
    const W = 680, H = 1020, R = 32, SCALE = 2;
    const canvas = createCanvas(W * SCALE, H * SCALE);
    const ctx = canvas.getContext('2d') as any;
    ctx.scale(SCALE, SCALE);

    // ── White card background ─────────────────────────────────
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, 0, 0, W, H, R);
    ctx.fill();

    // ── Crimson header ────────────────────────────────────────
    const headerH = 180;
    ctx.fillStyle = '#8A0112';
    this.roundRect(ctx, 0, 0, W, headerH, [R, R, 0, 0]);
    ctx.fill();

    // Music icon circle
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(56, 56, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♪', 56, 63);

    // Org name & card title
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '600 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AVISHKAR DHOL TASHA PATHAK', 98, 47);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Member Card', 98, 78);

    // Header accent line
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, headerH - 4, W, 4);

    // ── Avatar circle ─────────────────────────────────────────
    const avatarY = headerH + 64;
    ctx.fillStyle = '#FDEEF0';
    ctx.beginPath();
    ctx.arc(W / 2, avatarY, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#F5C2C7';
    ctx.lineWidth = 2;
    ctx.stroke();

    const initials = fullName
      .split(' ')
      .map((n: string) => n[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
    ctx.fillStyle = '#8A0112';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(initials, W / 2, avatarY + 12);

    // ── Member name ───────────────────────────────────────────
    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fullName, W / 2, avatarY + 76);

    // ── Instrument badge ──────────────────────────────────────
    const badge = instrument.charAt(0).toUpperCase() + instrument.slice(1);
    ctx.font = '600 15px sans-serif';
    const bW = ctx.measureText(badge).width + 36;
    const bY = avatarY + 94;
    ctx.fillStyle = '#FDEEF0';
    this.roundRect(ctx, W / 2 - bW / 2, bY, bW, 30, 15);
    ctx.fill();
    ctx.fillStyle = '#8A0112';
    ctx.fillText(badge, W / 2, bY + 20);

    // ── Divider ───────────────────────────────────────────────
    const divY = bY + 52;
    ctx.strokeStyle = '#E0DFD8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, divY);
    ctx.lineTo(W - 60, divY);
    ctx.stroke();

    // ── QR code ───────────────────────────────────────────────
    const qrImg = await loadImage(qrDataUrl);
    const qrSize = 380;
    const qrX = (W - qrSize) / 2;
    const qrY = divY + 24;

    // QR container box
    ctx.fillStyle = '#FAFAF7';
    ctx.strokeStyle = '#E0DFD8';
    ctx.lineWidth = 1;
    this.roundRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 16);
    ctx.fill();
    ctx.stroke();

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // ── Member ID pill ─────────────────────────────────────────
    const idY = qrY + qrSize + 36;
    ctx.fillStyle = '#FDEEF0';
    this.roundRect(ctx, W / 2 - 130, idY, 260, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#8A0112';
    ctx.font = 'bold 19px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(memberId, W / 2, idY + 28);

    // ── Scan instructions ──────────────────────────────────────
    ctx.fillStyle = '#888888';
    ctx.font = '14px sans-serif';
    ctx.fillText('Scan this QR code to mark attendance', W / 2, idY + 74);
    ctx.fillText('Keep this card safe', W / 2, idY + 94);

    // ── Crimson footer ─────────────────────────────────────────
    ctx.fillStyle = '#8A0112';
    this.roundRect(ctx, 0, H - 52, W, 52, [0, 0, R, R]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '13px sans-serif';
    ctx.fillText('avishkardhtp.org', W / 2, H - 20);

    // ── Outer border ───────────────────────────────────────────
    ctx.strokeStyle = '#E0DFD8';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 1, 1, W - 2, H - 2, R);
    ctx.stroke();

    return canvas.toBuffer('image/png');
  }

  async downloadAllQrZip(): Promise<Buffer> {
    const members = await this.db.query(
      `SELECT id, member_id, full_name, instrument, qr_token
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

      const cardBuffer = await this.renderMemberCard(
        member.full_name,
        member.member_id,
        member.instrument ?? 'dhol',
        qrDataUrl,
      );

      const safeName = (member.full_name as string)
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      zip.file(`${member.member_id}_${safeName}.png`, cardBuffer);
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
    const qrDataUrl = await renderQrFromToken(rows[0].member_id, rows[0].qr_token);
    return {
      memberId: rows[0].member_id,
      fullName: rows[0].full_name,
      qrDataUrl,
      generatedAt: rows[0].qr_generated_at,
    };
  }
}
