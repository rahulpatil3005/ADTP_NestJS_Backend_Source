import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import axios from 'axios';
import * as FormData from 'form-data';
import { QrPayload } from '../utils/qr.util';

const GRAPH_URL = 'https://graph.facebook.com/v20.0';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  private get token() { return process.env.WHATSAPP_TOKEN; }
  private get phoneNumberId() { return process.env.WHATSAPP_PHONE_NUMBER_ID; }
  private get enabled() { return !!(this.token && this.phoneNumberId); }

  /**
   * Sends a welcome WhatsApp message with QR code image to the new member.
   * Silently skips if WhatsApp credentials are not configured.
   */
  async sendMemberWelcome(params: {
    to: string;
    fullName: string;
    memberId: string;
    instrument: string;
    encryptedToken: string;
  }) {
    if (!this.enabled) {
      this.logger.warn('WhatsApp not configured — skipping welcome message');
      return;
    }

    const to = this.normalizePhone(params.to);

    try {
      // 1. Generate QR PNG buffer
      const payload: QrPayload = { memberId: params.memberId, token: params.encryptedToken };
      const qrBuffer: Buffer = await QRCode.toBuffer(JSON.stringify(payload), {
        errorCorrectionLevel: 'H',
        width: 600,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      // 2. Upload QR image to Meta media API → get media_id
      const mediaId = await this.uploadMedia(qrBuffer);

      // 3. Send image message with caption
      await this.sendImageMessage(to, mediaId, this.buildCaption(params));

      // 4. Send formatted text welcome card
      await this.sendTextMessage(to, this.buildWelcomeText(params));

      this.logger.log(`WhatsApp welcome sent to ${to} (member ${params.memberId})`);
    } catch (err: any) {
      // Never throw — WhatsApp failure must not block member creation
      this.logger.error(`WhatsApp send failed for ${to}: ${err?.message}`);
    }
  }

  // ── Private helpers ──────────────────────────────────────

  private async uploadMedia(buffer: Buffer): Promise<string> {
    const form = new FormData();
    form.append('file', buffer, { filename: 'qr.png', contentType: 'image/png' });
    form.append('type', 'image/png');
    form.append('messaging_product', 'whatsapp');

    const res = await axios.post(
      `${GRAPH_URL}/${this.phoneNumberId}/media`,
      form,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...form.getHeaders(),
        },
      },
    );
    return res.data.id;
  }

  private async sendImageMessage(to: string, mediaId: string, caption: string) {
    await axios.post(
      `${GRAPH_URL}/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: { id: mediaId, caption },
      },
      { headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } },
    );
  }

  private async sendTextMessage(to: string, text: string) {
    await axios.post(
      `${GRAPH_URL}/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text, preview_url: false },
      },
      { headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } },
    );
  }

  private buildCaption(p: { fullName: string; memberId: string; instrument: string }): string {
    return `🎶 *Avishkar DHTP — Member QR Card*\n\nName: ${p.fullName}\nMember ID: ${p.memberId}\nInstrument: ${p.instrument}\n\nScan this QR code at the entrance to mark your attendance.`;
  }

  private buildWelcomeText(p: { fullName: string; memberId: string; instrument: string }): string {
    return (
      `🎉 *Welcome to Avishkar Dhol Tasha Pathak!*\n\n` +
      `Hello *${p.fullName}*,\n\n` +
      `Your membership has been successfully registered.\n\n` +
      `📋 *Your Details:*\n` +
      `• Member ID: \`${p.memberId}\`\n` +
      `• Instrument: ${p.instrument}\n\n` +
      `Your QR card has been shared above. Please save it — you will need to show it at every practice session for attendance.\n\n` +
      `_Avishkar DHTP Team_ 🥁`
    );
  }

  private normalizePhone(mobile: string): string {
    // Strip spaces/dashes, add India country code if missing
    const digits = mobile.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits;
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }
}
