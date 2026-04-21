import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { RequestWithUser } from '../interfaces/request-with-user.interface.js';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = context.switchToHttp().getRequest<RequestWithUser>();

        if (!user || !user.isAdmin) {
            throw new ForbiddenException('Admin access required');
        }

        return true;
    }
}
