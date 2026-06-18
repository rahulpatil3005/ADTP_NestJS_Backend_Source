import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SettingsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async getAll() {
    const rows = await this.db.query(
      `SELECT key, value, description, updated_at FROM core.system_config ORDER BY key`,
    );
    // Flatten jsonb values
    return rows.map((r: any) => ({ ...r, value: r.value }));
  }

  async get(key: string) {
    const rows = await this.db.query(
      `SELECT key, value, description FROM core.system_config WHERE key = $1`, [key],
    );
    return rows[0] ?? null;
  }

  async set(key: string, value: any, userId: string) {
    await this.db.query(
      `INSERT INTO core.system_config (key, value, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = $2::jsonb, updated_by = $3, updated_at = NOW()`,
      [key, JSON.stringify(value), userId],
    );
    return { key, value };
  }

  /** Helper used by other services to read a boolean config */
  async getBool(key: string, defaultValue = false): Promise<boolean> {
    const row = await this.get(key);
    if (!row) return defaultValue;
    const v = row.value;
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === true) return true;
    return defaultValue;
  }
}
