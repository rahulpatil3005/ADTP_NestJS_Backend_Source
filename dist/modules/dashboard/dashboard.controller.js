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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let DashboardController = class DashboardController {
    constructor(db) {
        this.db = db;
    }
    async superAdminDashboard() {
        const today = new Date().toISOString().split('T')[0];
        const [members, today_summary, recent_regs, admins, weekly] = await Promise.all([
            this.db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') AS active_members,
          COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_members,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_members,
          COUNT(*) AS total_members
        FROM core.members WHERE deleted_at IS NULL
      `),
            this.db.query(`SELECT * FROM attendance.daily_summary WHERE session_date = $1`, [today]),
            this.db.query(`
        SELECT id, member_id, full_name, instrument, status, joining_date, photo_url
        FROM core.members WHERE deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 10
      `),
            this.db.query(`SELECT COUNT(*) AS total_admins FROM core.admins`),
            this.db.query(`
        SELECT session_date,
               SUM(present_count) AS present,
               SUM(absent_count) AS absent,
               ROUND(AVG(attendance_percentage), 2) AS avg_percentage
        FROM attendance.daily_summary
        WHERE session_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY session_date ORDER BY session_date ASC
      `),
        ]);
        return {
            members: members[0],
            todaySummary: today_summary[0] ?? null,
            recentRegistrations: recent_regs,
            totalAdmins: Number(admins[0].total_admins),
            weeklyTrend: weekly,
        };
    }
    async adminDashboard() {
        const today = new Date().toISOString().split('T')[0];
        const [todaySummary, totalMembers, recentActivity] = await Promise.all([
            this.db.query(`SELECT * FROM attendance.daily_summary WHERE session_date = $1`, [today]),
            this.db.query(`SELECT COUNT(*) FROM core.members WHERE status = 'active' AND deleted_at IS NULL`),
            this.db.query(`
        SELECT r.*, m.full_name, m.member_id AS member_code, s.title AS session_title
        FROM attendance.records r
        JOIN core.members m ON m.id = r.member_id
        JOIN attendance.sessions s ON s.id = r.session_id
        ORDER BY r.created_at DESC LIMIT 20
      `),
        ]);
        return {
            todaySummary: todaySummary[0] ?? null,
            totalActiveMembers: Number(totalMembers[0].count),
            recentActivity,
        };
    }
    async memberDashboard(userId) {
        const memberRows = await this.db.query(`SELECT id FROM core.members WHERE user_id = $1`, [userId]);
        if (!memberRows.length)
            return null;
        const memberId = memberRows[0].id;
        const summary = await this.db.query(`SELECT * FROM core.member_attendance_summary WHERE member_id = $1`, [memberId]);
        return summary[0] ?? {};
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('super-admin'),
    (0, roles_decorator_1.Roles)('super_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Super Admin dashboard aggregates' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "superAdminDashboard", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Admin dashboard aggregates' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "adminDashboard", null);
__decorate([
    (0, common_1.Get)('member/:userId/summary'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin', 'member'),
    (0, swagger_1.ApiOperation)({ summary: 'Member personal dashboard' }),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "memberDashboard", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('dashboard'),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map