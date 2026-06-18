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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notifications_service_1 = require("./notifications.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let NotificationsController = class NotificationsController {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    send(dto) {
        return this.notificationsService.send(dto);
    }
    registerToken(userId, body) {
        return this.notificationsService.registerToken(userId, body.fcmToken, body.platform, body.deviceName);
    }
    myNotifications(userId, page, limit) {
        return this.notificationsService.getUserNotifications(userId, Number(page ?? 1), Number(limit ?? 20));
    }
    markRead(id, userId) {
        return this.notificationsService.markRead(id, userId);
    }
    markAllRead(userId) {
        return this.notificationsService.markAllRead(userId);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)('send'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Send push notification to users or a role' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "send", null);
__decorate([
    (0, common_1.Post)('register-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Register FCM device token for push notifications' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "registerToken", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'Get my notifications' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "myNotifications", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Mark notification as read' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Patch)('read-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all notifications as read' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAllRead", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('notifications'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map