import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { MembersModule } from './modules/members/members.module';
import { AdminsModule } from './modules/admins/admins.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { QrModule } from './modules/qr/qr.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Database — TypeORM with PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get('DB_USER', 'adtp_user'),
        password: cfg.get('DB_PASS', ''),
        database: cfg.get('DB_NAME', 'adtp_db'),
        schema: 'public',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,       // Always false in production; use migrations
        logging: cfg.get('NODE_ENV') === 'development',
        ssl: cfg.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // Rate limiting: 100 req / 60 s per IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Feature modules
    AuthModule,
    MembersModule,
    AdminsModule,
    AttendanceModule,
    QrModule,
    ReportsModule,
    NotificationsModule,
    DashboardModule,
    AuditModule,
    SettingsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AuditLogInterceptor,
  ],
})
export class AppModule {}
