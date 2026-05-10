import 'multer';
import { ConflictException, Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { Prisma, User as UserModel } from '../../prisma/generated/client.js';

import { mkdir } from 'fs/promises';
import * as path from 'path';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserDto } from './dto/user.dto.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(@Inject(UsersRepository) private readonly usersRepo: UsersRepository) {}

    async create(createUserDto: CreateUserDto): Promise<UserDto> {
        try {
            const hashedPassword = await Bun.password.hash(createUserDto.password);
            return await this.usersRepo.create({
                username: createUserDto.username,
                password: hashedPassword
            });
        } catch (error) {
            this.throwFriendlyUserError(error, 'Username already taken');
            throw error;
        }
    }

    findAll(): Promise<UserDto[]> {
        return this.usersRepo.findAll();
    }

    async findOne(id: number): Promise<UserDto> {
        const user = await this.usersRepo.findOne(id);
        if (!user) {
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
        try {
            const updateData: Prisma.UserUpdateInput = { ...updateUserDto };

            if (updateUserDto.password !== undefined) {
                updateData.password = await Bun.password.hash(updateUserDto.password);
            }

            return await this.usersRepo.update(id, updateData);
        } catch (error) {
            this.handleUserWriteError(error, id);
            throw error;
        }
    }

    async remove(id: number): Promise<UserDto> {
        try {
            return await this.usersRepo.remove(id);
        } catch (error) {
            this.handleUserWriteError(error, id);
            throw error;
        }
    }

    async uploadProfilePicture(id: number, file: Express.Multer.File): Promise<UserDto> {
        await this.findOne(id);

        const uploadDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
        await mkdir(uploadDir, { recursive: true });

        const filename = `${id}.webp`;
        const filePath = path.join(uploadDir, filename);

        /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        // @ts-expect-error Bun.Image is not in the types yet
        await new Bun.Image(file.buffer).resize(128, 128).webp().write(filePath);
        /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

        const publicUrl = `/uploads/profile-pictures/${filename}`;
        return this.usersRepo.update(id, { profilePicture: publicUrl });
    }

    async removeProfilePicture(id: number): Promise<UserDto> {
        const user = await this.findOne(id);

        await this.deleteLocalProfilePicture(user.profilePicture);

        return this.usersRepo.update(id, { profilePicture: null });
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
            this.logger.warn(`Failed to delete profile picture file ${filePath}`);
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
