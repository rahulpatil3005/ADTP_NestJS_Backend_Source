import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { WhatsAppService } from '../../common/services/whatsapp.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [MembersController],
  providers: [MembersService, WhatsAppService],
  exports: [MembersService],
})
export class MembersModule {}
