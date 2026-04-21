import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubscribeNotificationDto {
    @ApiProperty({ type: String, example: 'fcm_token_here', description: 'Firebase FCM Token' })
    @IsString()
    @IsNotEmpty()
    token!: string;
}
