import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User as UserModel } from '../../prisma/generated/client.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UserDto } from '../users/dto/user.dto.js';
import { UsersService } from '../users/users.service.js';
import { AppLogger } from '../logging/app-logger.js';

export type AuthenticatedUser = Omit<UserModel, 'password'>;

@Injectable()
export class AuthService {
    private readonly logger = new AppLogger(AuthService.name);

    constructor(
        @Inject(UsersService) private readonly usersService: UsersService,
        @Inject(JwtService) private readonly jwtService: JwtService
    ) {}

    async validateUser(username: string, pass: string): Promise<AuthenticatedUser | null> {
        this.logger.trace('Validating user credentials', { username });
        const user = await this.usersService.findOneByUsername(username);
        if (user && (await Bun.password.verify(pass, user.password))) {
            const { password: _password, ...result } = user;
            this.logger.info('User authenticated', { userId: result.id, username: result.username });
            return result;
        }

        this.logger.warn('Invalid login attempt', { username });
        return null;
    }

    login(user: AuthenticatedUser) {
        this.logger.info('Issuing JWT token', { userId: user.id, username: user.username, isAdmin: user.isAdmin });
        const payload = { username: user.username, sub: user.id, isAdmin: user.isAdmin };
        return {
            access_token: this.jwtService.sign(payload)
        };
    }

    async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<UserDto> {
        this.logger.info('Changing password', { userId });
        const user = await this.usersService.findOneWithPassword(userId);
        if (!user) {
            this.logger.warn('Password change failed: user not found', { userId });
            throw new NotFoundException('User not found');
        }

        const isPasswordValid = await Bun.password.verify(changePasswordDto.currentPassword, user.password);
        if (!isPasswordValid) {
            this.logger.warn('Password change rejected: current password invalid', { userId });
            throw new BadRequestException('Current password is incorrect');
        }

        const updatedUser = await this.usersService.update(userId, { password: changePasswordDto.newPassword });
        this.logger.info('Password changed successfully', { userId });
        return updatedUser;
    }
}
