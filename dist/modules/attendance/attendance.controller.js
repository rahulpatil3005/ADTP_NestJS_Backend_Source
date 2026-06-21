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
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const attendance_service_1 = require("./attendance.service");
const attendance_dto_1 = require("./dto/attendance.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const throttler_1 = require("@nestjs/throttler");
let AttendanceController = class AttendanceController {
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    createSession(dto, adminId) {
        return this.attendanceService.createSession(dto, adminId);
    }
    getSessions(page, limit) {
        return this.attendanceService.getSessions(Number(page ?? 1), Number(limit ?? 20));
    }
    getSession(id) {
        return this.attendanceService.getSession(id);
    }
    getSessionAttendance(id, filter) {
        return this.attendanceService.getSessionAttendance(id, filter);
    }
    deleteSession(id) {
        return this.attendanceService.deleteSession(id);
    }
    scan(dto, adminId) {
        return this.attendanceService.processQrScan(dto, adminId);
    }
    markManual(dto, adminId) {
        return this.attendanceService.markManual(dto, adminId);
    }
    getMemberHistory(memberId, filter) {
        return this.attendanceService.getMemberHistory(memberId, filter);
    }
    async faceScan(file, sessionId, adminId) {
        if (!file)
            throw new common_1.BadRequestException('Photo is required');
        if (!sessionId)
            throw new common_1.BadRequestException('sessionId is required');
        return this.attendanceService.processFaceScan(sessionId, file.buffer, adminId);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)('sessions'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new practice/event session' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dto_1.CreateSessionDto, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'List all sessions' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get session with attendance summary' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getSession", null);
__decorate([
    (0, common_1.Get)('sessions/:id/records'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all attendance records for a session' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attendance_dto_1.AttendanceFilterDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getSessionAttendance", null);
__decorate([
    (0, common_1.Delete)('sessions/:id'),
    (0, roles_decorator_1.Roles)('super_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a session and all its attendance records' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "deleteSession", null);
__decorate([
    (0, common_1.Post)('scan'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 300, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Process a QR code scan and mark attendance' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dto_1.QrScanDto, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "scan", null);
__decorate([
    (0, common_1.Post)('mark'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Manually mark attendance for a member' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dto_1.MarkAttendanceDto, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "markManual", null);
__decorate([
    (0, common_1.Get)('member/:memberId'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin', 'member'),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance history for a specific member' }),
    __param(0, (0, common_1.Param)('memberId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attendance_dto_1.AttendanceFilterDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getMemberHistory", null);
__decorate([
    (0, common_1.Post)('face-scan'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark attendance by face recognition (alternative to QR scan)' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('sessionId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "faceScan", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiTags)('attendance'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('attendance'),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map