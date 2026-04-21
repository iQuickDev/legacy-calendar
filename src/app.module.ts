import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EventsModule } from './events/events.module.js';
import { ConfigModule } from '@nestjs/config';

import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UploadsModule } from './uploads/uploads.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        UsersModule,
        EventsModule,
        NotificationsModule,
        UploadsModule
    ],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
