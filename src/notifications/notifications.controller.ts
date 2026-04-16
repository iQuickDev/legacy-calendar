import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { SubscribeNotificationDto } from './dto/subscribe-notification.dto';
import { type RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('subscribe')
    @ApiOperation({ summary: 'Subscribe device to notifications' })
    @ApiResponse({ status: 201, description: 'Subscribed successfully' })
    async subscribe(@Request() req: RequestWithUser, @Body() body: SubscribeNotificationDto): Promise<void> {
        await this.notificationsService.subscribe(req.user.userId as number, body.token);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('unsubscribe')
    @ApiOperation({ summary: 'Unsubscribe device from notifications' })
    @ApiResponse({ status: 201, description: 'Unsubscribed successfully' })
    async unsubscribe(@Body() body: SubscribeNotificationDto): Promise<void> {
        await this.notificationsService.unsubscribe(body.token);
    }
}
