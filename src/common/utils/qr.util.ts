import * as QRCode from 'qrcode';
import { encrypt, generateSecureToken } from './crypto.util';

export interface QrPayload {
  memberId: string;
  token: string;
}

/**
 * Generates an encrypted QR payload string and returns both
 * the raw token (for DB storage) and the base64 PNG image.
 */
export async function generateMemberQr(memberId: string): Promise<{
  rawToken: string;
  encryptedToken: string;
  qrBase64: string;
  qrDataUrl: string;
}> {
  const rawToken = generateSecureToken();
  const encryptedToken = encrypt(rawToken);

  const payload: QrPayload = { memberId, token: encryptedToken };
  const payloadString = JSON.stringify(payload);

  const qrDataUrl = await QRCode.toDataURL(payloadString, {
    errorCorrectionLevel: 'M',  // M=15% recovery — smaller payload, fewer modules, faster scan
    type: 'image/png',
    width: 800,                 // 2× resolution — crisp on high-DPI screens and prints
    margin: 3,                  // wider quiet zone improves scanner detection
    color: { dark: '#000000', light: '#FFFFFF' },
    rendererOpts: { quality: 1 },
  });

  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');

  return { rawToken, encryptedToken, qrBase64, qrDataUrl };
}

/**
 * Renders a QR image from an already-stored encrypted token (no new token generated).
 */
export async function renderQrFromToken(memberId: string, encryptedToken: string): Promise<string> {
  const payload: QrPayload = { memberId, token: encryptedToken };
  return QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 800,
    margin: 3,
    color: { dark: '#000000', light: '#FFFFFF' },
    rendererOpts: { quality: 1 },
  });
}

/**
 * Validates a scanned QR payload.
 * Returns the memberId if valid, throws if tampered.
 */
export function parseQrPayload(raw: string): QrPayload {
  try {
    const parsed = JSON.parse(raw) as QrPayload;
    if (!parsed.memberId || !parsed.token) {
      throw new Error('Invalid QR structure');
    }
    return parsed;
  } catch {
    throw new Error('Malformed QR code payload');
  }
}

/**
 * Calculates distance in metres between two GPS coordinates.
 * Uses the Haversine formula.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
