import { Body, Controller, Post, Request, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthenticatedUser } from './auth.service';
import { UsersService } from '../users/users.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthLoginDto } from './dto/auth-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { type RequestWithUser } from './interfaces/request-with-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        @Inject(AuthService) private authService: AuthService,
        @Inject(UsersService) private usersService: UsersService
    ) {}

    @UseGuards(AuthGuard('local'))
    @Post('login')
    @ApiOperation({ summary: 'User login' })
    @ApiBody({ type: AuthLoginDto })
    @ApiResponse({ status: 200, description: 'Return JWT access token' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    login(@Request() req: RequestWithUser, @Body() _loginDto: AuthLoginDto) {
        return this.authService.login(req.user as AuthenticatedUser);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('profile')
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'Return user profile' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getProfile(@Request() req: RequestWithUser) {
        return this.usersService.findOne(req.user.userId!);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    @ApiOperation({ summary: 'Change user password' })
    @ApiBody({ type: ChangePasswordDto })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    @ApiResponse({ status: 400, description: 'Incorrect current password' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async changePassword(@Request() req: RequestWithUser, @Body() changePasswordDto: ChangePasswordDto) {
        return this.authService.changePassword(req.user.userId!, changePasswordDto);
    }
}
