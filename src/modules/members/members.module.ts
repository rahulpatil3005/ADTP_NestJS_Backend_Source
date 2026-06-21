import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { FaceService } from './face.service';
import { WhatsAppService } from '../../common/services/whatsapp.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    SettingsModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files allowed') as any, false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [MembersController],
  providers: [MembersService, FaceService, WhatsAppService],
  exports: [MembersService, FaceService],
})
export class MembersModule {}
