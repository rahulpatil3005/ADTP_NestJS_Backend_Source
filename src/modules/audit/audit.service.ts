import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

@Injectable()
export class AuditService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO audit.logs
          (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          entry.userId ?? null,
          entry.action,
          entry.entityType ?? null,
          entry.entityId ?? null,
          entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          entry.newValues ? JSON.stringify(entry.newValues) : null,
          entry.ipAddress ?? null,
          entry.userAgent ?? null,
          entry.notes ?? null,
        ],
      );
    } catch {
      // Audit failures must never break the main request
    }
  }

  async getLogs(page = 1, limit = 50, filters: Record<string, any> = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['1=1'];
    const params: any[] = [];
    let idx = 1;

    if (filters.userId) {
      conditions.push(`l.user_id = $${idx}`); params.push(filters.userId); idx++;
    }
    if (filters.action) {
      conditions.push(`l.action = $${idx}`); params.push(filters.action); idx++;
    }
    if (filters.entityType) {
      conditions.push(`l.entity_type = $${idx}`); params.push(filters.entityType); idx++;
    }
    if (filters.fromDate) {
      conditions.push(`l.created_at >= $${idx}`); params.push(filters.fromDate); idx++;
    }

    const rows = await this.db.query(
      `SELECT l.*, u.email AS user_email
       FROM audit.logs l LEFT JOIN auth.users u ON u.id = l.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );
    return rows;
  }
}
