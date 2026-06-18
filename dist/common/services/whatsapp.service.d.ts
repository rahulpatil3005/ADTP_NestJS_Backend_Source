export declare class WhatsAppService {
    private readonly logger;
    private get token();
    private get phoneNumberId();
    private get enabled();
    sendMemberWelcome(params: {
        to: string;
        fullName: string;
        memberId: string;
        instrument: string;
        encryptedToken: string;
    }): Promise<void>;
    private uploadMedia;
    private sendImageMessage;
    private sendTextMessage;
    private buildCaption;
    private buildWelcomeText;
    private normalizePhone;
}
