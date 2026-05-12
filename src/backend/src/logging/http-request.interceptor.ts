import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    HttpException
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AppLogger } from './app-logger.js';

@Injectable()
export class HttpRequestLoggingInterceptor implements NestInterceptor {
    private readonly logger = new AppLogger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request & { user?: { userId?: number; username?: string } }>();
        const response = context.switchToHttp().getResponse<Response>();
        const requestId = this.resolveRequestId(request);
        const startedAt = Date.now();
        const userId = request.user?.userId;

        this.logger.debug('Request started', {
            requestId,
            method: request.method,
            url: request.originalUrl ?? request.url,
            userId
        });

        response.setHeader('X-Request-ID', requestId);

        return next.handle().pipe(
            tap(() => {
                this.logger.info('Request completed', {
                    requestId,
                    method: request.method,
                    url: request.originalUrl ?? request.url,
                    statusCode: response.statusCode,
                    durationMs: Date.now() - startedAt,
                    userId
                });
            }),
            catchError((error: unknown) => {
                const statusCode = this.resolveStatusCode(error);
                const details = {
                    requestId,
                    method: request.method,
                    url: request.originalUrl ?? request.url,
                    statusCode,
                    durationMs: Date.now() - startedAt,
                    userId,
                    error: error instanceof Error ? error.message : String(error)
                };

                if (statusCode >= 500) {
                    this.logger.error('Request failed', error instanceof Error ? error.stack : undefined, undefined);
                    this.logger.critical('Request failed with server error', details);
                } else {
                    this.logger.warn('Request failed', details);
                }

                return throwError(() => error);
            })
        );
    }

    private resolveRequestId(request: Request): string {
        const headerRequestId = request.headers['x-request-id'];
        if (typeof headerRequestId === 'string' && headerRequestId.trim()) {
            return headerRequestId.trim();
        }

        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private resolveStatusCode(error: unknown): number {
        if (error instanceof HttpException) {
            return error.getStatus();
        }

        if (typeof error === 'object' && error !== null) {
            const candidate = error as { status?: number; code?: number };
            if (typeof candidate.status === 'number') {
                return candidate.status;
            }
            if (typeof candidate.code === 'number') {
                return candidate.code;
            }
        }

        return 500;
    }
}
