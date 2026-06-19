"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async send(dto) {
        let userIds = dto.userIds ?? [];
        if (dto.role && !userIds.length) {
            const rows = await this.db.query(`SELECT id FROM auth.users WHERE role = $1 AND is_active = true AND deleted_at IS NULL`, [dto.role]);
            userIds = rows.map((r) => r.id);
        }
        await Promise.all(userIds.map((uid) => this.db.query(`INSERT INTO notifications.notifications (user_id, title, body, type, data, sent_at)
           VALUES ($1,$2,$3,$4,$5,NOW())`, [uid, dto.title, dto.body, dto.type, JSON.stringify(dto.data ?? {})])));
        return { sent: userIds.length };
    }
    async registerToken(userId, fcmToken, platform, deviceName) {
        await this.db.query(`INSERT INTO notifications.device_tokens (user_id, fcm_token, platform, device_name)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, fcm_token) DO UPDATE SET is_active = true, updated_at = NOW()`, [userId, fcmToken, platform, deviceName ?? null]);
        return { message: 'Device registered' };
    }
    async getUserNotifications(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        return this.db.query(`SELECT * FROM notifications.notifications
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [userId, limit, offset]);
    }
    async markRead(notificationId, userId) {
        await this.db.query(`UPDATE notifications.notifications
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`, [notificationId, userId]);
        return { message: 'Marked as read' };
    }
    async markAllRead(userId) {
        await this.db.query(`UPDATE notifications.notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`, [userId]);
        return { message: 'All notifications marked as read' };
    }
    async sendPracticeReminder(sessionId) {
        const sessionRows = await this.db.query(`SELECT title, session_date FROM attendance.sessions WHERE id = $1`, [sessionId]);
        if (!sessionRows.length)
            return;
        const session = sessionRows[0];
        await this.send({
            role: 'member',
            title: 'Practice Reminder 🥁',
            body: `Practice session "${session.title}" is tomorrow. Don't forget!`,
            type: 'practice_reminder',
            data: { sessionId },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map