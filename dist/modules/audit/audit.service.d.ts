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
export declare class AuditService {
    private readonly db;
    constructor(db: DataSource);
    log(entry: AuditLogEntry): Promise<void>;
    getLogs(page?: number, limit?: number, filters?: Record<string, any>): Promise<any>;
}
