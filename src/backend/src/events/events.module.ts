import { Module } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { EventsController } from './events.controller.js';
import { EventsRepository } from './events.repository.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AuditLogController } from '../audit-log/audit-log.controller.js';
import { AuditLogRepository } from '../audit-log/audit-log.repository.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [EventsController, AuditLogController],
    providers: [EventsService, EventsRepository, AuditLogService, AuditLogRepository],
    exports: [EventsService, EventsRepository, AuditLogService]
})
export class EventsModule {}
