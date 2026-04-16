import { EventParticipantDto, EventResponseDto } from './dto/event-response.dto';
import { UserDto } from '../users/dto/user.dto';
import { EventWithRelations } from './events.repository';

function mapUserDto(user: { id: number; username: string; profilePicture: string | null }): UserDto {
    return {
        id: user.id,
        username: user.username,
        profilePicture: user.profilePicture
    };
}

export function mapEventToDto(event: EventWithRelations): EventResponseDto {
    const rideAssignmentsByPassengerId = new Map(
        event.rideAssignments.map((assignment) => [assignment.passengerId, assignment])
    );

    const participantsDto: EventParticipantDto[] = event.participants.map((attendance) => {
        const rideAssignment = rideAssignmentsByPassengerId.get(attendance.userId);

        return {
            ...mapUserDto(attendance.user),
            status: attendance.status,
            wantsFood: attendance.wantsFood,
            wantsWeed: attendance.wantsWeed,
            wantsSleep: attendance.wantsSleep,
            wantsAlcohol: attendance.wantsAlcohol,
            wantsBeer: attendance.wantsBeer,
            hasVehicle: attendance.hasVehicle,
            vehicleSeats: attendance.vehicleSeats,
            driverId: rideAssignment?.driverId,
            driver: rideAssignment?.driver ? mapUserDto(rideAssignment.driver) : undefined
        };
    });

    return {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime ?? null,
        host: mapUserDto(event.host),
        participants: participantsDto,
        isOpen: event.isOpen,
        isPrivate: event.isPrivate,
        hasFood: event.hasFood,
        hasWeed: event.hasWeed,
        hasSleep: event.hasSleep,
        hasAlcohol: event.hasAlcohol,
        hasBeer: event.hasBeer,
        foodPrice: event.foodPrice,
        weedPrice: event.weedPrice,
        sleepPrice: event.sleepPrice,
        alcoholPrice: event.alcoholPrice,
        beerPrice: event.beerPrice
    };
}
