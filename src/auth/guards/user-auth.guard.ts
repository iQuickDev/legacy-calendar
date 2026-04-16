import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class UserAuthGuard extends JwtAuthGuard {
    constructor(private configService: ConfigService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        const bypassHeader = request.headers['x-bypass'];
        const bypassKey = this.configService.get<string>('BYPASS_KEY');

        if (bypassHeader && bypassHeader === bypassKey) {
            (request as Record<string, any>).isBypass = true;
            return true;
        }

        return super.canActivate(context) as Promise<boolean>;
    }
}
