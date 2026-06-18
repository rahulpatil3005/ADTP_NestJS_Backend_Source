export interface QrPayload {
    memberId: string;
    token: string;
}
export declare function generateMemberQr(memberId: string): Promise<{
    rawToken: string;
    encryptedToken: string;
    qrBase64: string;
    qrDataUrl: string;
}>;
export declare function renderQrFromToken(memberId: string, encryptedToken: string): Promise<string>;
export declare function parseQrPayload(raw: string): QrPayload;
export declare function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
