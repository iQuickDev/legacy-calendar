import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
    imports: [PrismaModule],
    controllers: [UsersController],
    providers: [UsersService, UsersRepository],
    exports: [UsersService]
})
export class UsersModule {}
