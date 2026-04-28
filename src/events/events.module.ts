import { Module } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { EventsController } from './events.controller.js';
import { EventsRepository } from './events.repository.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [EventsController],
    providers: [EventsService, EventsRepository]
})
export class EventsModule {}
