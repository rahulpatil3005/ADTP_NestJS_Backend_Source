import { NotificationsService, SendNotificationDto } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    send(dto: SendNotificationDto): Promise<{
        sent: number;
        pushTokens: number;
    }>;
    registerToken(userId: string, body: {
        fcmToken: string;
        platform: string;
        deviceName?: string;
    }): Promise<{
        message: string;
    }>;
    myNotifications(userId: string, page: string, limit: string): Promise<any>;
    markRead(id: string, userId: string): Promise<{
        message: string;
    }>;
    markAllRead(userId: string): Promise<{
        message: string;
    }>;
}
