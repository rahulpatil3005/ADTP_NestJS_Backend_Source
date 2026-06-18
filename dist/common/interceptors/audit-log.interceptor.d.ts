import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
export declare class AuditLogInterceptor implements NestInterceptor {
    private readonly auditService;
    constructor(auditService: AuditService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private resolveAction;
    private resolveEntity;
}
