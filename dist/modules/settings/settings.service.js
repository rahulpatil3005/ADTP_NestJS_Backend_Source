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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let SettingsService = class SettingsService {
    constructor(db) {
        this.db = db;
    }
    async getAll() {
        const rows = await this.db.query(`SELECT key, value, description, updated_at FROM core.system_config ORDER BY key`);
        return rows.map((r) => ({ ...r, value: r.value }));
    }
    async get(key) {
        const rows = await this.db.query(`SELECT key, value, description FROM core.system_config WHERE key = $1`, [key]);
        return rows[0] ?? null;
    }
    async set(key, value, userId) {
        await this.db.query(`INSERT INTO core.system_config (key, value, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = $2::jsonb, updated_by = $3, updated_at = NOW()`, [key, JSON.stringify(value), userId]);
        return { key, value };
    }
    async getBool(key, defaultValue = false) {
        const row = await this.get(key);
        if (!row)
            return defaultValue;
        const v = row.value;
        if (typeof v === 'boolean')
            return v;
        if (v === 'true' || v === true)
            return true;
        return defaultValue;
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], SettingsService);
//# sourceMappingURL=settings.service.js.map