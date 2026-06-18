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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let AuditService = class AuditService {
    constructor(db) {
        this.db = db;
    }
    async log(entry) {
        try {
            await this.db.query(`INSERT INTO audit.logs
          (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
                entry.userId ?? null,
                entry.action,
                entry.entityType ?? null,
                entry.entityId ?? null,
                entry.oldValues ? JSON.stringify(entry.oldValues) : null,
                entry.newValues ? JSON.stringify(entry.newValues) : null,
                entry.ipAddress ?? null,
                entry.userAgent ?? null,
                entry.notes ?? null,
            ]);
        }
        catch {
        }
    }
    async getLogs(page = 1, limit = 50, filters = {}) {
        const offset = (page - 1) * limit;
        const conditions = ['1=1'];
        const params = [];
        let idx = 1;
        if (filters.userId) {
            conditions.push(`l.user_id = $${idx}`);
            params.push(filters.userId);
            idx++;
        }
        if (filters.action) {
            conditions.push(`l.action = $${idx}`);
            params.push(filters.action);
            idx++;
        }
        if (filters.entityType) {
            conditions.push(`l.entity_type = $${idx}`);
            params.push(filters.entityType);
            idx++;
        }
        if (filters.fromDate) {
            conditions.push(`l.created_at >= $${idx}`);
            params.push(filters.fromDate);
            idx++;
        }
        const rows = await this.db.query(`SELECT l.*, u.email AS user_email
       FROM audit.logs l LEFT JOIN auth.users u ON u.id = l.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]);
        return rows;
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], AuditService);
//# sourceMappingURL=audit.service.js.map