import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User as UserModel } from '../../prisma/generated/client.js';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';

export type AuthenticatedUser = Omit<UserModel, 'password'>;

@Injectable()
export class AuthService {
    constructor(
        @Inject(UsersService) private readonly usersService: UsersService,
        @Inject(JwtService) private readonly jwtService: JwtService
    ) {}

    async validateUser(username: string, pass: string): Promise<AuthenticatedUser | null> {
        const user = await this.usersService.findOneByUsername(username);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password: _password, ...result } = user;
            return result;
        }

        return null;
    }

    login(user: AuthenticatedUser) {
        const payload = { username: user.username, sub: user.id, isAdmin: user.isAdmin };
        return {
            access_token: this.jwtService.sign(payload)
        };
    }

    async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<UserDto> {
        const user = await this.usersService.findOneWithPassword(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        return this.usersService.update(userId, { password: changePasswordDto.newPassword });
    }
}
