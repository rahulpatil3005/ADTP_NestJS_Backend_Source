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
exports.QrController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const qr_service_1 = require("./qr.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let QrController = class QrController {
    constructor(qrService) {
        this.qrService = qrService;
    }
    async downloadAllZip(res) {
        const buffer = await this.qrService.downloadAllQrZip();
        const date = new Date().toISOString().split('T')[0];
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="ADTP_QR_Cards_${date}.zip"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
    getQr(id) {
        return this.qrService.getQrForMember(id);
    }
    regenerate(id) {
        return this.qrService.generateForMember(id);
    }
    bulkGenerate(body) {
        return this.qrService.generateBulk(body.memberIds);
    }
};
exports.QrController = QrController;
__decorate([
    (0, common_1.Get)('download-all-zip'),
    (0, roles_decorator_1.Roles)('super_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Download all active member QR cards as a ZIP (super admin only)' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QrController.prototype, "downloadAllZip", null);
__decorate([
    (0, common_1.Get)('member/:id'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin', 'member'),
    (0, swagger_1.ApiOperation)({ summary: 'Get or generate QR code for a member' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "getQr", null);
__decorate([
    (0, common_1.Post)('member/:id/regenerate'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Regenerate QR code (invalidates existing)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "regenerate", null);
__decorate([
    (0, common_1.Post)('bulk-generate'),
    (0, roles_decorator_1.Roles)('super_admin', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk generate QR codes for multiple members' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "bulkGenerate", null);
exports.QrController = QrController = __decorate([
    (0, swagger_1.ApiTags)('qr'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('qr'),
    __metadata("design:paramtypes", [qr_service_1.QrService])
], QrController);
//# sourceMappingURL=qr.controller.js.map