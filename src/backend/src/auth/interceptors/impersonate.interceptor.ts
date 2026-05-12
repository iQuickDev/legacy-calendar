import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UsersService } from '../../users/users.service.js';
import { RequestWithUser } from '../interfaces/request-with-user.interface.js';
import { AppLogger } from '../../logging/app-logger.js';

@Injectable()
export class ImpersonateInterceptor implements NestInterceptor {
    private readonly logger = new AppLogger(ImpersonateInterceptor.name);
    constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const impersonateUserId = request.headers['x-impersonate'];

        // Only admins can impersonate
        if (impersonateUserId) {
            if (request.user && request.user.isAdmin) {
                const userId = parseInt(impersonateUserId as string, 10);
                if (!isNaN(userId)) {
                    try {
                        const user = await this.usersService.findOne(userId);
                        if (user) {
                            this.logger.warn('Admin impersonation applied', {
                                adminUsername: request.user.username,
                                impersonatedUserId: user.id,
                                impersonatedUsername: user.username
                            });
                            // Switch current user to the impersonated one
                            request.user = {
                                userId: user.id,
                                id: user.id,
                                username: user.username,
                                isAdmin: user.isAdmin
                            };
                        } else {
                            this.logger.warn('Impersonation failed: user not found', { userId });
                        }
                    } catch (error) {
                        this.logger.error('Error during impersonation', error instanceof Error ? error.stack ?? error.message : String(error));
                        // If user not found, just continue as the original user
                    }
                }
            } else if (request.user) {
                // Only warn if an authenticated non-admin user is attempting impersonation.
                // Unauthenticated requests (public endpoints) still receive the header from
                // the frontend, so we silently ignore those to avoid log spam.
                this.logger.warn('Impersonation attempt by non-admin user', { username: request.user.username });
            }
        }

        return next.handle();
    }
}
