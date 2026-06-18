import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as admin from 'firebase-admin';

export interface SendNotificationDto {
  userIds?: string[];
  role?: string;    // broadcast to all users of a role
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {
    // Firebase Admin SDK — skip init if credentials are not configured (local dev)
    if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
  }

  // ── Send to specific users ───────────────────────────────

  async send(dto: SendNotificationDto) {
    let userIds = dto.userIds ?? [];

    // If broadcasting to a role, fetch all user IDs of that role
    if (dto.role && !userIds.length) {
      const rows = await this.db.query(
        `SELECT id FROM auth.users WHERE role = $1 AND is_active = true AND deleted_at IS NULL`,
        [dto.role],
      );
      userIds = rows.map((r: any) => r.id);
    }

    // Persist in-app notifications
    await Promise.all(
      userIds.map((uid) =>
        this.db.query(
          `INSERT INTO notifications.notifications (user_id, title, body, type, data, sent_at)
           VALUES ($1,$2,$3,$4,$5,NOW())`,
          [uid, dto.title, dto.body, dto.type, JSON.stringify(dto.data ?? {})],
        ),
      ),
    );

    // Get FCM tokens for all users
    const tokenRows = await this.db.query(
      `SELECT fcm_token FROM notifications.device_tokens
       WHERE user_id = ANY($1) AND is_active = true`,
      [userIds],
    );
    const tokens: string[] = tokenRows.map((r: any) => r.fcm_token);

    if (tokens.length && admin.apps.length) {
      try {
        const result = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: { title: dto.title, body: dto.body },
          data: dto.data ?? {},
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        });
        this.logger.log(
          `FCM sent: ${result.successCount} success, ${result.failureCount} fail`,
        );
      } catch (err) {
        this.logger.error('FCM send error', err);
      }
    }

    return { sent: userIds.length, pushTokens: tokens.length };
  }

  // ── Register device token ────────────────────────────────

  async registerToken(userId: string, fcmToken: string, platform: string, deviceName?: string) {
    await this.db.query(
      `INSERT INTO notifications.device_tokens (user_id, fcm_token, platform, device_name)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, fcm_token) DO UPDATE SET is_active = true, updated_at = NOW()`,
      [userId, fcmToken, platform, deviceName ?? null],
    );
    return { message: 'Device registered' };
  }

  // ── Get user notifications ───────────────────────────────

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return this.db.query(
      `SELECT * FROM notifications.notifications
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
  }

  async markRead(notificationId: string, userId: string) {
    await this.db.query(
      `UPDATE notifications.notifications
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId],
    );
    return { message: 'Marked as read' };
  }

  async markAllRead(userId: string) {
    await this.db.query(
      `UPDATE notifications.notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId],
    );
    return { message: 'All notifications marked as read' };
  }

  // ── Practice reminder helper (called by scheduler) ──────

  async sendPracticeReminder(sessionId: string) {
    const sessionRows = await this.db.query(
      `SELECT title, session_date FROM attendance.sessions WHERE id = $1`, [sessionId],
    );
    if (!sessionRows.length) return;
    const session = sessionRows[0];

    await this.send({
      role: 'member',
      title: 'Practice Reminder 🥁',
      body: `Practice session "${session.title}" is tomorrow. Don't forget!`,
      type: 'practice_reminder',
      data: { sessionId },
    });
  }
}
