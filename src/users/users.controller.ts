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
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import type { Express } from 'express';
import { BypassGuard } from '../auth/guards/bypass.guard';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

type AuthedRequest = ExpressRequest & {
    isBypass?: boolean;
    user?: {
        userId: number;
    };
};

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @UseGuards(BypassGuard)
    @ApiOperation({ summary: 'Create a new user' })
    @ApiHeader({ name: 'X-Bypass', description: 'Bypass key for user operations' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 409, description: 'Username already taken' })
    @ApiResponse({ status: 401, description: 'Missing or invalid X-Bypass header' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'Return all users' })
    findAll() {
        return this.usersService.findAll();
    }

    @Post('profile-picture')
    @UseGuards(UserAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload profile picture' })
    @ApiBearerAuth()
    @ApiHeader({ name: 'X-Bypass', description: 'Bypass key for user operations (optional if using JWT)', required: false })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Profile picture uploaded' })
    @ApiResponse({ status: 400, description: 'Invalid file' })
    uploadProfilePicture(
        @Body('userId') userId: string | undefined,
        @Request() req: AuthedRequest,
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({
                    fileType: /image\/(jpg|jpeg|png|webp)$/,
                })
                .addMaxSizeValidator({
                    maxSize: 10 * 1024 * 1024,
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                }),
        )
        file: Express.Multer.File,
    ) {
        const targetUserId = this.resolveTargetUserId(req, userId);
        this.ensureOwnProfilePictureAccess(req, targetUserId, 'update');

        return this.usersService.uploadProfilePicture(targetUserId, file);
    }

    @Delete('profile-picture')
    @UseGuards(UserAuthGuard)
    @ApiOperation({ summary: 'Remove profile picture' })
    @ApiBearerAuth()
    @ApiHeader({ name: 'X-Bypass', description: 'Bypass key for user operations (optional if using JWT)', required: false })
    @ApiResponse({ status: 200, description: 'Profile picture removed' })
    removeProfilePicture(@Body('userId') userId: string | undefined, @Request() req: AuthedRequest) {
        const targetUserId = this.resolveTargetUserId(req, userId);
        this.ensureOwnProfilePictureAccess(req, targetUserId, 'remove');

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
    @UseGuards(BypassGuard)
    @ApiOperation({ summary: 'Update a user' })
    @ApiHeader({ name: 'X-Bypass', description: 'Bypass key for user operations' })
    @ApiResponse({ status: 200, description: 'User updated' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 401, description: 'Missing or invalid X-Bypass header' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @UseGuards(BypassGuard)
    @ApiOperation({ summary: 'Delete a user' })
    @ApiHeader({ name: 'X-Bypass', description: 'Bypass key for user operations' })
    @ApiResponse({ status: 200, description: 'User deleted' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 401, description: 'Missing or invalid X-Bypass header' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.remove(id);
    }

    private resolveTargetUserId(req: AuthedRequest, userId?: string): number {
        const targetUserId = req.isBypass
            ? Number(userId)
            : userId
                ? Number(userId)
                : req.user?.userId;

        if (typeof targetUserId !== 'number' || !Number.isInteger(targetUserId)) {
            throw new BadRequestException('Invalid or missing userId');
        }

        return targetUserId;
    }

    private ensureOwnProfilePictureAccess(req: AuthedRequest, targetUserId: number, action: 'update' | 'remove'): void {
        if (!req.isBypass && req.user && targetUserId !== req.user.userId) {
            throw new ForbiddenException(`You can only ${action} your own profile picture`);
        }
    }
}
