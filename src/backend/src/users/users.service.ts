import 'multer';
import { ConflictException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Prisma, User as UserModel } from '../../prisma/generated/client.js';

import { mkdir } from 'fs/promises';
import * as path from 'path';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserDto } from './dto/user.dto.js';
import { UsersRepository } from './users.repository.js';
import { AppLogger } from '../logging/app-logger.js';

@Injectable()
export class UsersService {
    private readonly logger = new AppLogger(UsersService.name);

    constructor(@Inject(UsersRepository) private readonly usersRepo: UsersRepository) {}

    async create(createUserDto: CreateUserDto): Promise<UserDto> {
        this.logger.info('Creating user', { username: createUserDto.username });
        try {
            const hashedPassword = await Bun.password.hash(createUserDto.password);
            const user = await this.usersRepo.create({
                username: createUserDto.username,
                password: hashedPassword
            });
            this.logger.info('User created', { userId: user.id, username: user.username });
            return user;
        } catch (error) {
            this.throwFriendlyUserError(error, 'Username already taken');
            this.logger.error('Failed to create user', error);
            throw error;
        }
    }

    findAll(): Promise<UserDto[]> {
        this.logger.debug('Fetching users list');
        return this.usersRepo.findAll();
    }

    async findOne(id: number): Promise<UserDto> {
        this.logger.trace('Fetching user', { userId: id });
        const user = await this.usersRepo.findOne(id);
        if (!user) {
            this.logger.warn('User not found', { userId: id });
            throw new NotFoundException(`User with id ${id} not found`);
        }

        return user;
    }

    async findOneWithPassword(id: number): Promise<UserModel | null> {
        return this.usersRepo.findOneWithPassword(id);
    }

    async findOneByUsername(username: string): Promise<UserModel | null> {
        return this.usersRepo.findOneByUsername(username);
    }

    async update(id: number, updateUserDto: UpdateUserDto): Promise<UserDto> {
        this.logger.info('Updating user', { userId: id, fields: Object.keys(updateUserDto) });
        try {
            const updateData: Prisma.UserUpdateInput = { ...updateUserDto };

            if (updateUserDto.password !== undefined) {
                updateData.password = await Bun.password.hash(updateUserDto.password);
            }

            const user = await this.usersRepo.update(id, updateData);
            this.logger.info('User updated', { userId: id });
            return user;
        } catch (error) {
            this.handleUserWriteError(error, id);
            this.logger.error('Failed to update user', error);
            throw error;
        }
    }

    async remove(id: number): Promise<UserDto> {
        this.logger.warn('Removing user', { userId: id });
        try {
            const user = await this.usersRepo.remove(id);
            this.logger.info('User removed', { userId: id, username: user.username });
            return user;
        } catch (error) {
            this.handleUserWriteError(error, id);
            this.logger.error('Failed to remove user', error);
            throw error;
        }
    }

    async uploadProfilePicture(id: number, file: Express.Multer.File): Promise<UserDto> {
        this.logger.info('Uploading profile picture', { userId: id, fileName: file.originalname, size: file.size });
        await this.findOne(id);

        const uploadDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
        await mkdir(uploadDir, { recursive: true });

        const filename = `${id}.webp`;
        const filePath = path.join(uploadDir, filename);

        await new Bun.Image(file.buffer).resize(128, 128).webp().write(filePath);

        const publicUrl = `/uploads/profile-pictures/${filename}`;
        const user = await this.usersRepo.update(id, { profilePicture: publicUrl });
        this.logger.info('Profile picture uploaded', { userId: id, path: publicUrl });
        return user;
    }

    async removeProfilePicture(id: number): Promise<UserDto> {
        this.logger.info('Removing profile picture', { userId: id });
        const user = await this.findOne(id);

        await this.deleteLocalProfilePicture(user.profilePicture);

        const updatedUser = await this.usersRepo.update(id, { profilePicture: null });
        this.logger.info('Profile picture removed', { userId: id });
        return updatedUser;
    }

    private async deleteLocalProfilePicture(profilePicture: string | null | undefined): Promise<void> {
        if (!profilePicture || !profilePicture.startsWith('/uploads/')) {
            return;
        }

        const relativePath = profilePicture.replace('/uploads/', '');
        const filePath = path.join(process.cwd(), 'uploads', relativePath);

        try {
            const f = Bun.file(filePath);
            if (await f.exists()) {
                await f.delete();
            }
        } catch {
            this.logger.warn('Failed to delete profile picture file', { filePath });
        }
    }

    private handleUserWriteError(error: unknown, id: number): void {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException('Username already taken');
            }

            if (error.code === 'P2025') {
                throw new NotFoundException(`User with id ${id} not found`);
            }
        }
    }

    private throwFriendlyUserError(error: unknown, message: string): void {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException(message);
        }
    }
}
