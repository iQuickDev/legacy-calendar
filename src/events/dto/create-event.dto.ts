import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEventStartTimeWithinAllowedRange } from '../validators/is-event-start-time-within-allowed-range.validator';

export class CreateEventDto {
    @ApiProperty({ example: 'Team Standup', description: 'Title of the event' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'Weekly sync with the team', description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'Meeting Room A', description: 'Location of the event', required: false })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiProperty({
        example: '2026-02-04T10:00:00Z',
        description: 'Start time (ISO 8601). Must be today or within 1 year from now.'
    })
    @IsDateString()
    @IsEventStartTimeWithinAllowedRange()
    @IsNotEmpty()
    startTime: string;

    @ApiProperty({
        example: '2026-02-04T11:00:00Z',
        description: 'End time (ISO 8601). Must be today or within 1 year from now.',
        required: false
    })
    @IsDateString()
    @IsEventStartTimeWithinAllowedRange()
    @IsOptional()
    endTime?: string;

    @ApiProperty({ example: [1, 2], description: 'List of participant user IDs', required: false })
    @IsOptional()
    @IsInt({ each: true })
    participants?: number[];

    @ApiProperty({
        example: '2026-02-04T09:00:00Z',
        description: 'Deadline for participation (ISO 8601).',
        required: false
    })
    @IsDateString()
    @IsOptional()
    participationDeadline?: string;


    @ApiProperty({ example: true, description: 'Whether the event can be joined spontaneously', required: false })
    @IsOptional()
    @IsBoolean()
    isOpen?: boolean;

    @ApiProperty({
        example: false,
        description: 'Whether the event is private (visible only to invitees)',
        required: false
    })
    @IsOptional()
    @IsBoolean()
    isPrivate?: boolean;

    @ApiProperty({ example: true, description: 'Whether the event has food', required: false })
    @IsOptional()
    @IsBoolean()
    hasFood?: boolean;

    @ApiProperty({ example: true, description: 'Whether the event has weed', required: false })
    @IsOptional()
    @IsBoolean()
    hasWeed?: boolean;

    @ApiProperty({ example: true, description: 'Whether the event has sleep', required: false })
    @IsOptional()
    @IsBoolean()
    hasSleep?: boolean;

    @ApiProperty({ example: true, description: 'Whether the event has alcohol', required: false })
    @IsOptional()
    @IsBoolean()
    hasAlcohol?: boolean;

    @ApiProperty({ example: true, description: 'Whether the event has beer', required: false })
    @IsOptional()
    @IsBoolean()
    hasBeer?: boolean;

    @ApiProperty({ example: 10.5, description: 'Food budget', required: false })
    @IsOptional()
    @IsNumber()
    foodPrice?: number;

    @ApiProperty({ example: 50, description: 'Weed budget', required: false })
    @IsOptional()
    @IsNumber()
    weedPrice?: number;

    @ApiProperty({ example: 20, description: 'Sleep/Accommodation budget', required: false })
    @IsOptional()
    @IsNumber()
    sleepPrice?: number;

    @ApiProperty({ example: 30, description: 'Alcohol budget', required: false })
    @IsOptional()
    @IsNumber()
    alcoholPrice?: number;

    @ApiProperty({ example: 15, description: 'Beer budget', required: false })
    @IsOptional()
    @IsNumber()
    beerPrice?: number;
}
