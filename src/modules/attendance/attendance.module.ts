import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [
    MembersModule,
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
