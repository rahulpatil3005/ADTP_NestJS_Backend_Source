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
exports.AdminsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admins_service_1 = require("./admins.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let AdminsController = class AdminsController {
    constructor(adminsService) {
        this.adminsService = adminsService;
    }
    create(dto, createdBy) {
        return this.adminsService.create(dto, createdBy);
    }
    findAll() {
        return this.adminsService.findAll();
    }
    findOne(id) {
        return this.adminsService.findOne(id);
    }
    update(id, dto) {
        return this.adminsService.update(id, dto);
    }
    updatePermissions(id, body) {
        return this.adminsService.updatePermissions(id, body.permissions);
    }
    activate(id) {
        return this.adminsService.toggleActive(id, true);
    }
    deactivate(id) {
        return this.adminsService.toggleActive(id, false);
    }
    resetPassword(id, body) {
        return this.adminsService.resetPassword(id, body.newPassword);
    }
    remove(id) {
        return this.adminsService.remove(id);
    }
};
exports.AdminsController = AdminsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new admin (super_admin only)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admins_service_1.CreateAdminDto, String]),
    __metadata("design:returntype", void 0)
], AdminsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all admins' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get admin profile' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update admin details (name, email, phone)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admins_service_1.UpdateAdminDto]),
    __metadata("design:returntype", void 0)
], AdminsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/permissions'),
    (0, swagger_1.ApiOperation)({ summary: 'Update admin permissions' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminsController.prototype, "updatePermissions", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'Activate admin account' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminsController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate admin account' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminsController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Patch)(':id/reset-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset admin password' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminsController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete admin account permanently' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminsController.prototype, "remove", null);
exports.AdminsController = AdminsController = __decorate([
    (0, swagger_1.ApiTags)('admins'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('super_admin'),
    (0, common_1.Controller)('admins'),
    __metadata("design:paramtypes", [admins_service_1.AdminsService])
], AdminsController);
//# sourceMappingURL=admins.controller.js.map