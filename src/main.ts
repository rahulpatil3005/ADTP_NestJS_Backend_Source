import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as compression from 'compression';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

async function bootstrap() {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads', 'photos');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  // Security — helmet before static assets so CORP header can be overridden per-path
  app.use(helmet({
    crossOriginResourcePolicy: false, // we set it per-route below
  }));
  app.use(compression());
  app.enableCors({
    origin: '*',
    credentials: false,
  });

  // Serve uploaded photos as static files at /uploads/...
  // Must be after enableCors so CORS headers are applied
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    setHeaders: (res: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(),
    app.get(AuditLogInterceptor),
  );

  // Swagger
  const config = new DocumentBuilder()
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
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🥁 ADTP API running on http://localhost:${port}/api/v1`, 'Bootstrap');
  Logger.log(`📖 Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
