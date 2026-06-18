import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';

@Global()  // AuditService available everywhere without re-importing
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
