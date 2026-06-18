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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const audit_service_1 = require("../../modules/audit/audit.service");
const AUDIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
let AuditLogInterceptor = class AuditLogInterceptor {
    constructor(auditService) {
        this.auditService = auditService;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const { method, url, user, ip } = request;
        if (!AUDIT_METHODS.includes(method))
            return next.handle();
        const action = this.resolveAction(method, url);
        const entityType = this.resolveEntity(url);
        return next.handle().pipe((0, operators_1.tap)((data) => {
            if (user?.id) {
                this.auditService.log({
                    userId: user.id,
                    action,
                    entityType,
                    entityId: data?.id ?? data?.data?.id,
                    newValues: request.body,
                    ipAddress: ip,
                    userAgent: request.headers['user-agent'],
                });
            }
        }));
    }
    resolveAction(method, url) {
        if (url.includes('/qr'))
            return 'qr_generate';
        if (url.includes('/scan'))
            return 'qr_scan';
        if (url.includes('/export'))
            return 'export';
        if (url.includes('/import'))
            return 'import';
        const map = {
            POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete',
        };
        return map[method] ?? 'update';
    }
    resolveEntity(url) {
        if (url.includes('/members'))
            return 'members';
        if (url.includes('/admins'))
            return 'admins';
        if (url.includes('/attendance'))
            return 'attendance';
        if (url.includes('/sessions'))
            return 'sessions';
        if (url.includes('/auth'))
            return 'auth';
        return 'system';
    }
};
exports.AuditLogInterceptor = AuditLogInterceptor;
exports.AuditLogInterceptor = AuditLogInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditLogInterceptor);
//# sourceMappingURL=audit-log.interceptor.js.map