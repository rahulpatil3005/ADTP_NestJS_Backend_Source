"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.generateSecureToken = generateSecureToken;
exports.hashToken = hashToken;
const crypto = require("crypto");
const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '0'.repeat(64), 'hex');
function encrypt(plainText) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([
        cipher.update(plainText, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted.toString('hex'),
    ].join(':');
}
function decrypt(cipherText) {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}
function generateSecureToken() {
    return crypto.randomUUID();
}
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
//# sourceMappingURL=crypto.util.js.map