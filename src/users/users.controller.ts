import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpStatus,
    Param,
    ParseFilePipeBuilder,
    ParseIntPipe,
    Patch,
    Post,
    Request,
    UseGuards,
    UseInterceptors,
    UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Express } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { type RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @UseGuards(UserAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new user (Admin only)' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 409, description: 'Username already taken' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @UseGuards(UserAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiResponse({ status: 200, description: 'Return all users' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    findAll() {
        return this.usersService.findAll();
    }

    @Post('profile-picture')
    @UseGuards(UserAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload profile picture' })
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                },
                userId: {
                    type: 'string',
                    description: 'Target user ID (Admin only to specify someone else)'
                }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Profile picture uploaded' })
    @ApiResponse({ status: 400, description: 'Invalid file' })
    uploadProfilePicture(
        @Body('userId') userId: string | undefined,
        @Request() req: RequestWithUser,
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({
                    fileType: /image\/(jpg|jpeg|png|webp)$/
                })
                .addMaxSizeValidator({
                    maxSize: 10 * 1024 * 1024
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
                })
        )
        file: Express.Multer.File
    ) {
        const targetUserId = this.resolveTargetUserId(req, userId);
        this.ensureOwnOrAdminAccess(req, targetUserId, 'update picture for');

        return this.usersService.uploadProfilePicture(targetUserId, file);
    }

    @Delete('profile-picture')
    @UseGuards(UserAuthGuard)
    @ApiOperation({ summary: 'Remove profile picture' })
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: 'Profile picture removed' })
    removeProfilePicture(@Body('userId') userId: string | undefined, @Request() req: RequestWithUser) {
        const targetUserId = this.resolveTargetUserId(req, userId);
        this.ensureOwnOrAdminAccess(req, targetUserId, 'remove picture for');

        return this.usersService.removeProfilePicture(targetUserId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiResponse({ status: 200, description: 'Return user' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(UserAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a user (Admin only)' })
    @ApiResponse({ status: 200, description: 'User updated' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @UseGuards(UserAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a user (Admin only)' })
    @ApiResponse({ status: 200, description: 'User deleted' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.remove(id);
    }

    private resolveTargetUserId(req: RequestWithUser, userId?: string): number {
        const targetUserId = userId ? Number(userId) : req.user.userId;

        if (typeof targetUserId !== 'number' || !Number.isInteger(targetUserId)) {
            throw new BadRequestException('Invalid or missing userId');
        }

        return targetUserId;
    }

    private ensureOwnOrAdminAccess(req: RequestWithUser, targetUserId: number, action: string): void {
        const isAdmin = req.user.isAdmin;
        const isSelf = req.user.userId === targetUserId;

        if (!isAdmin && !isSelf) {
            throw new ForbiddenException(`You can only ${action} your own profile`);
        }
    }
}
