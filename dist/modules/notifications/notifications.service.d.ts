import { DataSource } from 'typeorm';
export interface SendNotificationDto {
    userIds?: string[];
    role?: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, string>;
}
export declare class NotificationsService {
    private readonly db;
    private readonly logger;
    constructor(db: DataSource);
    send(dto: SendNotificationDto): Promise<{
        sent: number;
        pushTokens: number;
    }>;
    registerToken(userId: string, fcmToken: string, platform: string, deviceName?: string): Promise<{
        message: string;
    }>;
    getUserNotifications(userId: string, page?: number, limit?: number): Promise<any>;
    markRead(notificationId: string, userId: string): Promise<{
        message: string;
    }>;
    markAllRead(userId: string): Promise<{
        message: string;
    }>;
    sendPracticeReminder(sessionId: string): Promise<void>;
}
