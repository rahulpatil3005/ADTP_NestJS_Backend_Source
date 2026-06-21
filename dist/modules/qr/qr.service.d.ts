import { DataSource } from 'typeorm';
export declare class QrService {
    private readonly db;
    constructor(db: DataSource);
    generateForMember(memberId: string): Promise<{
        memberId: any;
        fullName: any;
        qrDataUrl: string;
        generatedAt: string;
    }>;
    generateBulk(memberIds: string[]): Promise<{
        memberId: string;
        success: boolean;
        data: {
            memberId: any;
            fullName: any;
            qrDataUrl: string;
            generatedAt: string;
        };
        error: any;
    }[]>;
    private roundRect;
    private renderMemberCard;
    downloadAllQrZip(): Promise<Buffer>;
    getQrForMember(memberId: string): Promise<{
        memberId: any;
        fullName: any;
        qrDataUrl: string;
        generatedAt: any;
    }>;
}
