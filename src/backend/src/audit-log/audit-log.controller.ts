import { Controller, Get, Inject, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { type RequestWithUser } from '../auth/interfaces/request-with-user.interface.js';
import { AuditLogService } from './audit-log.service.js';

@ApiTags('events')
@Controller('events')
export class AuditLogController {
    constructor(@Inject(AuditLogService) private readonly auditLogService: AuditLogService) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get(':id/audit-log')
    @ApiOperation({ summary: 'Get the audit log for an event' })
    @ApiResponse({ status: 200, description: 'Return event audit log', type: Object, isArray: true })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Event not found' })
    getAuditLog(@Param('id', ParseIntPipe) id: number, @Request() req: RequestWithUser) {
        return this.auditLogService.getEventAuditLog(id, req.user.userId as number);
    }
}
