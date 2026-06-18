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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    daily(date) {
        return this.reportsService.getDailyReport(date ?? new Date().toISOString().split('T')[0]);
    }
    range(fromDate, toDate, memberId) {
        return this.reportsService.getRangeReport({ fromDate, toDate, memberId });
    }
    members() {
        return this.reportsService.getMembersReport({});
    }
    async exportExcel(fromDate, toDate, res) {
        const buffer = await this.reportsService.exportExcel({ fromDate, toDate });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=ADTP_Attendance_${Date.now()}.xlsx`);
        res.status(common_1.HttpStatus.OK).send(buffer);
    }
    async exportCsv(fromDate, toDate, res) {
        const csv = await this.reportsService.exportCsv({ fromDate, toDate });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ADTP_Attendance_${Date.now()}.csv`);
        res.status(common_1.HttpStatus.OK).send(csv);
    }
    async exportAttendanceSummary(fromDate, toDate, res) {
        const buffer = await this.reportsService.exportExcel({ fromDate, toDate });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=ADTP_Attendance_Summary_${Date.now()}.xlsx`);
        res.status(common_1.HttpStatus.OK).send(buffer);
    }
    async exportMemberList(res) {
        const buffer = await this.reportsService.exportMemberList();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=ADTP_Member_List_${Date.now()}.xlsx`);
        res.status(common_1.HttpStatus.OK).send(buffer);
    }
    async exportInactiveMembers(res) {
        const buffer = await this.reportsService.exportInactiveMembers();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=ADTP_Inactive_Members_${Date.now()}.xlsx`);
        res.status(common_1.HttpStatus.OK).send(buffer);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('daily'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Daily attendance summary' }),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "daily", null);
__decorate([
    (0, common_1.Get)('range'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Attendance for a date range (JSON)' }),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "range", null);
__decorate([
    (0, common_1.Get)('members'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'All-members attendance summary' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "members", null);
__decorate([
    (0, common_1.Get)('export/excel'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Export attendance report as Excel (.xlsx)' }),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportExcel", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Export attendance report as CSV' }),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)('export/attendance-summary'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Export attendance summary as Excel' }),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportAttendanceSummary", null);
__decorate([
    (0, common_1.Get)('export/member-list'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Export full member list as Excel' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportMemberList", null);
__decorate([
    (0, common_1.Get)('export/inactive-members'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Export inactive/absent members as Excel' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportInactiveMembers", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map