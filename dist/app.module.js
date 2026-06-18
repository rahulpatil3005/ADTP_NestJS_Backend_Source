"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const audit_log_interceptor_1 = require("./common/interceptors/audit-log.interceptor");
const auth_module_1 = require("./modules/auth/auth.module");
const members_module_1 = require("./modules/members/members.module");
const admins_module_1 = require("./modules/admins/admins.module");
const attendance_module_1 = require("./modules/attendance/attendance.module");
const qr_module_1 = require("./modules/qr/qr.module");
const reports_module_1 = require("./modules/reports/reports.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const audit_module_1 = require("./modules/audit/audit.module");
const settings_module_1 = require("./modules/settings/settings.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    type: 'postgres',
                    host: cfg.get('DB_HOST', 'localhost'),
                    port: cfg.get('DB_PORT', 5432),
                    username: cfg.get('DB_USER', 'adtp_user'),
                    password: cfg.get('DB_PASS', ''),
                    database: cfg.get('DB_NAME', 'adtp_db'),
                    schema: 'public',
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    synchronize: false,
                    logging: cfg.get('NODE_ENV') === 'development',
                    ssl: cfg.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
                }),
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
            auth_module_1.AuthModule,
            members_module_1.MembersModule,
            admins_module_1.AdminsModule,
            attendance_module_1.AttendanceModule,
            qr_module_1.QrModule,
            reports_module_1.ReportsModule,
            notifications_module_1.NotificationsModule,
            dashboard_module_1.DashboardModule,
            audit_module_1.AuditModule,
            settings_module_1.SettingsModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            audit_log_interceptor_1.AuditLogInterceptor,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map