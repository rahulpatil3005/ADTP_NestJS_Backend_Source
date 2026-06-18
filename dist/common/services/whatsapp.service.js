"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WhatsAppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const QRCode = require("qrcode");
const axios_1 = require("axios");
const FormData = require("form-data");
const GRAPH_URL = 'https://graph.facebook.com/v20.0';
let WhatsAppService = WhatsAppService_1 = class WhatsAppService {
    constructor() {
        this.logger = new common_1.Logger(WhatsAppService_1.name);
    }
    get token() { return process.env.WHATSAPP_TOKEN; }
    get phoneNumberId() { return process.env.WHATSAPP_PHONE_NUMBER_ID; }
    get enabled() { return !!(this.token && this.phoneNumberId); }
    async sendMemberWelcome(params) {
        if (!this.enabled) {
            this.logger.warn('WhatsApp not configured — skipping welcome message');
            return;
        }
        const to = this.normalizePhone(params.to);
        try {
            const payload = { memberId: params.memberId, token: params.encryptedToken };
            const qrBuffer = await QRCode.toBuffer(JSON.stringify(payload), {
                errorCorrectionLevel: 'H',
                width: 600,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' },
            });
            const mediaId = await this.uploadMedia(qrBuffer);
            await this.sendImageMessage(to, mediaId, this.buildCaption(params));
            await this.sendTextMessage(to, this.buildWelcomeText(params));
            this.logger.log(`WhatsApp welcome sent to ${to} (member ${params.memberId})`);
        }
        catch (err) {
            this.logger.error(`WhatsApp send failed for ${to}: ${err?.message}`);
        }
    }
    async uploadMedia(buffer) {
        const form = new FormData();
        form.append('file', buffer, { filename: 'qr.png', contentType: 'image/png' });
        form.append('type', 'image/png');
        form.append('messaging_product', 'whatsapp');
        const res = await axios_1.default.post(`${GRAPH_URL}/${this.phoneNumberId}/media`, form, {
            headers: {
                Authorization: `Bearer ${this.token}`,
                ...form.getHeaders(),
            },
        });
        return res.data.id;
    }
    async sendImageMessage(to, mediaId, caption) {
        await axios_1.default.post(`${GRAPH_URL}/${this.phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            to,
            type: 'image',
            image: { id: mediaId, caption },
        }, { headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } });
    }
    async sendTextMessage(to, text) {
        await axios_1.default.post(`${GRAPH_URL}/${this.phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text, preview_url: false },
        }, { headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } });
    }
    buildCaption(p) {
        return `🎶 *Avishkar DHTP — Member QR Card*\n\nName: ${p.fullName}\nMember ID: ${p.memberId}\nInstrument: ${p.instrument}\n\nScan this QR code at the entrance to mark your attendance.`;
    }
    buildWelcomeText(p) {
        return (`🎉 *Welcome to Avishkar Dhol Tasha Pathak!*\n\n` +
            `Hello *${p.fullName}*,\n\n` +
            `Your membership has been successfully registered.\n\n` +
            `📋 *Your Details:*\n` +
            `• Member ID: \`${p.memberId}\`\n` +
            `• Instrument: ${p.instrument}\n\n` +
            `Your QR card has been shared above. Please save it — you will need to show it at every practice session for attendance.\n\n` +
            `_Avishkar DHTP Team_ 🥁`);
    }
    normalizePhone(mobile) {
        const digits = mobile.replace(/\D/g, '');
        if (digits.startsWith('91') && digits.length === 12)
            return digits;
        if (digits.length === 10)
            return `91${digits}`;
        return digits;
    }
};
exports.WhatsAppService = WhatsAppService;
exports.WhatsAppService = WhatsAppService = WhatsAppService_1 = __decorate([
    (0, common_1.Injectable)()
], WhatsAppService);
//# sourceMappingURL=whatsapp.service.js.map