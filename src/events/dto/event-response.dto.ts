import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../users/dto/user.dto';
import { InviteStatus } from '@prisma/client';

export class EventParticipantDto extends UserDto {
    @ApiProperty({ enum: InviteStatus, example: 'PENDING', description: 'Status of the invitation' })
    status!: InviteStatus;

    @ApiProperty({ example: true, description: 'User wants food' })
    wantsFood?: boolean;

    @ApiProperty({ example: true, description: 'User wants weed' })
    wantsWeed?: boolean;

    @ApiProperty({ example: true, description: 'User wants sleep' })
    wantsSleep?: boolean;

    @ApiProperty({ example: true, description: 'User wants alcohol' })
    wantsAlcohol?: boolean;

    @ApiProperty({ example: true, description: 'User wants beer' })
    wantsBeer?: boolean;

    @ApiProperty({ example: true, description: 'User has a vehicle' })
    hasVehicle?: boolean;

    @ApiProperty({ example: 4, description: 'Number of available seats' })
    vehicleSeats?: number;

    @ApiProperty({ example: 1, description: 'Driver ID', required: false })
    driverId?: number;

    @ApiProperty({ type: UserDto, description: 'Driver details', required: false })
    driver?: UserDto;
}

export class EventResponseDto {
    @ApiProperty({ example: 1, description: 'Event ID' })
    id!: number;

    @ApiProperty({ example: 'Team Standup', description: 'Title of the event' })
    title!: string;

    @ApiProperty({ example: 'Weekly sync with the team', description: 'Description', required: false, nullable: true })
    description?: string | null;

    @ApiProperty({ example: 'Meeting Room A', description: 'Location', required: false, nullable: true })
    location?: string | null;

    @ApiProperty({ example: '2026-02-04T10:00:00Z', description: 'Start time' })
    startTime!: Date;

    @ApiProperty({ example: '2026-02-04T11:00:00Z', description: 'End time', required: false })
    endTime!: Date | null;

    @ApiProperty({
        example: '2026-02-04T09:00:00Z',
        description: 'Deadline for participation',
        required: false,
        nullable: true
    })
    participationDeadline!: Date | null;

    @ApiProperty({ type: UserDto, description: 'Host of the event' })
    host!: UserDto;

    @ApiProperty({ type: [EventParticipantDto], description: 'List of participants' })
    participants!: EventParticipantDto[];

    @ApiProperty({ example: true, description: 'Whether the event is open for spontaneous joining' })
    isOpen!: boolean;

    @ApiProperty({ example: false, description: 'Whether the event is private' })
    isPrivate!: boolean;

    @ApiProperty({ example: true, description: 'Event has food' })
    hasFood?: boolean;

    @ApiProperty({ example: true, description: 'Event has weed' })
    hasWeed?: boolean;

    @ApiProperty({ example: true, description: 'Event has sleep' })
    hasSleep?: boolean;

    @ApiProperty({ example: true, description: 'Event has alcohol' })
    hasAlcohol?: boolean;

    @ApiProperty({ example: true, description: 'Event has beer' })
    hasBeer?: boolean;

    @ApiProperty({ example: 10.5, description: 'Food budget', required: false, nullable: true })
    foodPrice?: number | null;

    @ApiProperty({ example: 50, description: 'Weed budget', required: false, nullable: true })
    weedPrice?: number | null;

    @ApiProperty({ example: 20, description: 'Sleep/Accommodation budget', required: false, nullable: true })
    sleepPrice?: number | null;

    @ApiProperty({ example: 30, description: 'Alcohol budget', required: false, nullable: true })
    alcoholPrice?: number | null;

    @ApiProperty({ example: 15, description: 'Beer budget', required: false, nullable: true })
    beerPrice?: number | null;
}
