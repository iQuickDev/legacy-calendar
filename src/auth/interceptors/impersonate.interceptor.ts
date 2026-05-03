import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UsersService } from '../../users/users.service.js';
import { RequestWithUser } from '../interfaces/request-with-user.interface.js';

@Injectable()
export class ImpersonateInterceptor implements NestInterceptor {
    constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const impersonateUserId = request.headers['x-impersonate'];

        // Only admins can impersonate
        if (impersonateUserId && request.user && request.user.isAdmin) {
            const userId = parseInt(impersonateUserId as string, 10);
            if (!isNaN(userId)) {
                try {
                    const user = await this.usersService.findOne(userId);
                    if (user) {
                        // Switch current user to the impersonated one
                        request.user = {
                            userId: user.id,
                            id: user.id,
                            username: user.username,
                            isAdmin: user.isAdmin
                        };
                    }
                } catch (error) {
                    // If user not found, just continue as the original user
                }
            }
        }

        return next.handle();
    }
}
