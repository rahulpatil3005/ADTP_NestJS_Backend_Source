"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = require("helmet");
const compression = require("compression");
const path = require("path");
const fs = require("fs");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const response_transform_interceptor_1 = require("./common/interceptors/response-transform.interceptor");
const audit_log_interceptor_1 = require("./common/interceptors/audit-log.interceptor");
async function bootstrap() {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'photos');
    if (!fs.existsSync(uploadsDir))
        fs.mkdirSync(uploadsDir, { recursive: true });
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'warn', 'error', 'debug'],
    });
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: false,
    }));
    app.use(compression());
    app.enableCors({
        origin: '*',
        credentials: false,
    });
    app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
        prefix: '/uploads',
        setHeaders: (res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new response_transform_interceptor_1.ResponseTransformInterceptor(), app.get(audit_log_interceptor_1.AuditLogInterceptor));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Avishkar DHTP API')
        .setDescription('Attendance & Member Management System — REST API')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication & OTP')
        .addTag('members', 'Member management')
        .addTag('admins', 'Admin management')
        .addTag('attendance', 'QR scan & attendance')
        .addTag('sessions', 'Practice/event sessions')
        .addTag('qr', 'QR code generation')
        .addTag('reports', 'Reports & exports')
        .addTag('dashboard', 'Dashboard aggregations')
        .addTag('notifications', 'Push notifications')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT ?? 4000;
    await app.listen(port, '0.0.0.0');
    common_1.Logger.log(`🥁 ADTP API running on http://localhost:${port}/api/v1`, 'Bootstrap');
    common_1.Logger.log(`📖 Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map