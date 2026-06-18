"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMemberQr = generateMemberQr;
exports.renderQrFromToken = renderQrFromToken;
exports.parseQrPayload = parseQrPayload;
exports.haversineDistance = haversineDistance;
const QRCode = require("qrcode");
const crypto_util_1 = require("./crypto.util");
async function generateMemberQr(memberId) {
    const rawToken = (0, crypto_util_1.generateSecureToken)();
    const encryptedToken = (0, crypto_util_1.encrypt)(rawToken);
    const payload = { memberId, token: encryptedToken };
    const payloadString = JSON.stringify(payload);
    const qrDataUrl = await QRCode.toDataURL(payloadString, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 800,
        margin: 3,
        color: { dark: '#000000', light: '#FFFFFF' },
        rendererOpts: { quality: 1 },
    });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    return { rawToken, encryptedToken, qrBase64, qrDataUrl };
}
async function renderQrFromToken(memberId, encryptedToken) {
    const payload = { memberId, token: encryptedToken };
    return QRCode.toDataURL(JSON.stringify(payload), {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 800,
        margin: 3,
        color: { dark: '#000000', light: '#FFFFFF' },
        rendererOpts: { quality: 1 },
    });
}
function parseQrPayload(raw) {
    try {
        const parsed = JSON.parse(raw);
        if (!parsed.memberId || !parsed.token) {
            throw new Error('Invalid QR structure');
        }
        return parsed;
    }
    catch {
        throw new Error('Malformed QR code payload');
    }
}
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6_371_000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
//# sourceMappingURL=qr.util.js.map