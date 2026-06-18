import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

const AUDIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip } = request;

    if (!AUDIT_METHODS.includes(method)) return next.handle();

    const action = this.resolveAction(method, url);
    const entityType = this.resolveEntity(url);

    return next.handle().pipe(
      tap((data) => {
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
      }),
    );
  }

  private resolveAction(method: string, url: string): string {
    if (url.includes('/qr')) return 'qr_generate';
    if (url.includes('/scan')) return 'qr_scan';
    if (url.includes('/export')) return 'export';
    if (url.includes('/import')) return 'import';
    const map: Record<string, string> = {
      POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete',
    };
    return map[method] ?? 'update';
  }

  private resolveEntity(url: string): string {
    if (url.includes('/members')) return 'members';
    if (url.includes('/admins')) return 'admins';
    if (url.includes('/attendance')) return 'attendance';
    if (url.includes('/sessions')) return 'sessions';
    if (url.includes('/auth')) return 'auth';
    return 'system';
  }
}
