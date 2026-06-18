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
exports.MembersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const members_service_1 = require("./members.service");
const member_dto_1 = require("./dto/member.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let MembersController = class MembersController {
    constructor(membersService) {
        this.membersService = membersService;
    }
    create(dto, adminId) {
        return this.membersService.create(dto, adminId);
    }
    findAll(search) {
        return this.membersService.findAll(search);
    }
    findOne(id) {
        return this.membersService.findOne(id);
    }
    update(id, dto) {
        return this.membersService.update(id, dto);
    }
    remove(id) {
        return this.membersService.remove(id);
    }
    attendanceSummary(id) {
        return this.membersService.getAttendanceSummary(id);
    }
    bulkImport(body, adminId) {
        return this.membersService.bulkImport(body.members, adminId);
    }
};
exports.MembersController = MembersController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new member' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [member_dto_1.CreateMemberDto, String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'List all members (paginated, filterable)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [member_dto_1.MemberSearchDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin', 'member'),
    (0, swagger_1.ApiOperation)({ summary: 'Get member profile' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Update member profile' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, member_dto_1.UpdateMemberDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate (soft-delete) a member' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/attendance-summary'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin', 'member'),
    (0, swagger_1.ApiOperation)({ summary: 'Get member attendance statistics' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "attendanceSummary", null);
__decorate([
    (0, common_1.Post)('bulk-import'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk import members from parsed Excel data (JSON array)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "bulkImport", null);
exports.MembersController = MembersController = __decorate([
    (0, swagger_1.ApiTags)('members'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('members'),
    __metadata("design:paramtypes", [members_service_1.MembersService])
], MembersController);
//# sourceMappingURL=members.controller.js.map