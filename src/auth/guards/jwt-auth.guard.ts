import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest<TUser = any>(err: any, user: TUser, _info: any): TUser {
        if (err || !user) {
            throw err || new UnauthorizedException('Missing or invalid authentication token');
        }
        return user;
    }
}
