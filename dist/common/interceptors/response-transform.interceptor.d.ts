import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    data: T;
    timestamp: string;
}
export declare class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>>;
}
