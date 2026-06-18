import { QrService } from './qr.service';
export declare class QrController {
    private readonly qrService;
    constructor(qrService: QrService);
    getQr(id: string): Promise<{
        memberId: any;
        fullName: any;
        qrDataUrl: string;
        generatedAt: any;
    }>;
    regenerate(id: string): Promise<{
        memberId: any;
        fullName: any;
        qrDataUrl: string;
        generatedAt: string;
    }>;
    bulkGenerate(body: {
        memberIds: string[];
    }): Promise<{
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
}
