import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, InviteStatus } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ParticipateDto } from './dto/participate.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { EventsRepository, EventWithRelations } from './events.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationCode } from '../notifications/notification-codes';
import { EVENT_NOTIFICATION_MESSAGES, EVENT_NOTIFICATION_TITLES } from './event-notification.constants';
import { mapEventToDto } from './event-response.mapper';

@Injectable()
export class EventsService {
    constructor(
        private readonly eventsRepo: EventsRepository,
        private readonly notificationsService: NotificationsService,
    ) { }

    async create(createEventDto: CreateEventDto, userId: number): Promise<EventResponseDto> {
        const { participants = [], ...eventData } = createEventDto;
        const hostId = Number(userId);
        const participantIds = this.normalizeUserIds(participants);

        try {
            const event = await this.eventsRepo.create({
                ...this.buildCreateEventInput(eventData),
                host: { connect: { id: hostId } },
                ...(participantIds.length > 0
                    ? {
                        participants: {
                            create: participantIds.map(userId => ({
                                userId,
                                status: InviteStatus.PENDING,
                            })),
                        },
                    }
                    : {}),
            });

            if (participantIds.length > 0) {
                await this.notifyUserIds(
                    participantIds,
                    event.id,
                    NotificationCode.INVITATION_NEW,
                    EVENT_NOTIFICATION_TITLES.invitationNew,
                    EVENT_NOTIFICATION_MESSAGES.invitationNew(event.title),
                );
            }

            return mapEventToDto(event);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(
                    `User in host or participants not found. IDs: host=${hostId}, participants=[${participantIds.join(', ')}]`,
                );
            }
            throw error;
        }
    }

    async findAll(userId?: number): Promise<EventResponseDto[]> {
        const events = await this.eventsRepo.findAll(userId);
        return events.map(event => mapEventToDto(event));
    }

    async findOne(id: number, userId?: number): Promise<EventResponseDto> {
        const event = await this.eventsRepo.findOne(id, userId);
        if (!event) {
            throw new NotFoundException(`Event with id ${id} not found`);
        }

        return mapEventToDto(event);
    }

    async remove(id: number, userId: number) {
        const event = await this.findEventOrThrow(id, userId);

        if (event.hostId !== userId) {
            throw new ForbiddenException('Only the host can delete this event');
        }

        await this.notifyParticipants(
            event.id,
            NotificationCode.EVENT_CANCELLED,
            EVENT_NOTIFICATION_TITLES.eventCancelled,
            EVENT_NOTIFICATION_MESSAGES.eventCancelled(event.title),
        );

        return this.eventsRepo.remove(id);
    }

    async update(id: number, updateEventDto: UpdateEventDto, userId: number): Promise<EventResponseDto> {
        const event = await this.findEventOrThrow(id, userId);

        if (event.hostId !== userId) {
            throw new ForbiddenException('Only the host can update this event');
        }

        const { participants, ...eventData } = updateEventDto;
        const updateData: Prisma.EventUpdateInput = this.buildUpdateEventInput(eventData);
        let participantDiff: { toAdd: number[]; toRemove: number[] } | undefined;

        if (participants) {
            const existingParticipantIds = this.getParticipantUserIds(event);
            const nextParticipantIds = this.normalizeUserIds(participants);
            participantDiff = this.diffParticipantIds(existingParticipantIds, nextParticipantIds);
            const { toAdd, toRemove } = participantDiff;

            const participantsUpdate = this.buildParticipantsUpdate(toAdd, toRemove);
            if (participantsUpdate) {
                updateData.participants = participantsUpdate;
            }

            if (toRemove.length > 0) {
                await this.eventsRepo.deleteRideAssignmentsForUsers(id, toRemove);
            }
        }

        const updatedEvent = await this.eventsRepo.update(id, updateData);

        if (participantDiff) {
            const { toAdd } = participantDiff;

            if (toAdd.length > 0) {
                await this.notifyUserIds(
                    toAdd,
                    event.id,
                    NotificationCode.INVITATION_NEW,
                    EVENT_NOTIFICATION_TITLES.invitationNew,
                    EVENT_NOTIFICATION_MESSAGES.invitationNew(event.title),
                );
            }
        }

        await this.notifyParticipants(
            event.id,
            NotificationCode.EVENT_UPDATED,
            EVENT_NOTIFICATION_TITLES.eventUpdated,
            EVENT_NOTIFICATION_MESSAGES.eventUpdated(event.title),
            InviteStatus.ACCEPTED,
        );

        return mapEventToDto(updatedEvent);
    }

    async invite(eventId: number, username: string, userId: number) {
        const event = await this.findEventOrThrow(eventId, userId);

        if (event.hostId !== userId) {
            throw new ForbiddenException('Only the host can invite users');
        }

        const invitedUser = await this.eventsRepo.inviteUser(eventId, username);

        if (invitedUser) {
            await this.notifyUserIds(
                [invitedUser.id],
                eventId,
                NotificationCode.INVITATION_NEW,
                EVENT_NOTIFICATION_TITLES.invitationNew,
                EVENT_NOTIFICATION_MESSAGES.invitationNew(event.title),
            );
        }

        return { message: 'User invited' };
    }

    async join(eventId: number, userId: number, participateDto: ParticipateDto) {
        const event = await this.findEventOrThrow(eventId, userId);
        const participant = this.getParticipant(event, userId);
        const isParticipant = !!participant;

        if (!event.isOpen && !isParticipant && event.hostId !== userId) {
            throw new ForbiddenException('This event is closed and cannot be joined spontaneously');
        }

        const result = await this.eventsRepo.join(userId, eventId, participateDto);

        if (event.hostId !== userId) {
            const hostTokens = await this.eventsRepo.getUserTokens([event.hostId]);

            if (hostTokens.length > 0) {
                const joiningUser = await this.eventsRepo.getUserById(userId);
                const username = joiningUser?.username || 'A user';
                const wasPending = participant?.status === InviteStatus.PENDING;

                if (!isParticipant || wasPending) {
                    await this.notificationsService.sendMulticast(
                        hostTokens,
                        EVENT_NOTIFICATION_TITLES.participationAccepted,
                        EVENT_NOTIFICATION_MESSAGES.participationAccepted(username, event.title),
                        { type: NotificationCode.PARTICIPATION_ACCEPTED, eventId: String(eventId) },
                    );
                } else {
                    await this.notificationsService.sendMulticast(
                        hostTokens,
                        EVENT_NOTIFICATION_TITLES.participationUpdated,
                        EVENT_NOTIFICATION_MESSAGES.participationUpdated(username, event.title),
                        { type: NotificationCode.PARTICIPATION_UPDATED, eventId: String(eventId) },
                    );
                }
            }
        }

        return result;
    }

    async leave(eventId: number, userId: number) {
        const event = await this.findEventOrThrow(eventId, userId);

        try {
            const result = await this.eventsRepo.leave(userId, eventId);
            await this.eventsRepo.deleteRideAssignmentsForUsers(eventId, [userId]);

            if (event.hostId !== userId) {
                const hostTokens = await this.eventsRepo.getUserTokens([event.hostId]);

                if (hostTokens.length > 0) {
                    const leavingUser = await this.eventsRepo.getUserById(userId);
                    const username = leavingUser?.username || 'A user';
                    await this.notificationsService.sendMulticast(
                        hostTokens,
                        EVENT_NOTIFICATION_TITLES.participationCancelled,
                        EVENT_NOTIFICATION_MESSAGES.participationCancelled(username, event.title),
                        { type: NotificationCode.PARTICIPATION_CANCELLED, eventId: String(eventId) },
                    );
                }
            }

            return result;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException('Participation not found');
            }
            throw error;
        }
    }

    async assignRide(eventId: number, passengerId: number, driverId: number | null, requestingUserId: number) {
        const event = await this.findEventOrThrow(eventId, requestingUserId);

        const isHost = event.hostId === requestingUserId;
        const passenger = this.getParticipant(event, passengerId);

        if (!passenger) {
            throw new NotFoundException(`Passenger with id ${passengerId} is not in this event`);
        }

        const passengerAssignment = this.getRideAssignment(event, passengerId);
        const isCurrentDriver = passengerAssignment?.driverId === requestingUserId;
        const isAssigningToSelf = driverId === requestingUserId;
        const isUnassigningFromSelf = driverId === null && isCurrentDriver;

        if (!isHost && !isAssigningToSelf && !isUnassigningFromSelf) {
            throw new ForbiddenException('You do not have permission to assign rides for this event');
        }

        if (driverId !== null) {
            const driver = this.getParticipant(event, driverId);
            if (!driver) {
                throw new NotFoundException(`Driver with id ${driverId} is not in this event`);
            }

            if (!driver.hasVehicle) {
                throw new ForbiddenException('Selected driver does not have a vehicle for this event');
            }
        }

        await this.eventsRepo.assignRide(eventId, passengerId, driverId);

        if (driverId !== null) {
            await this.notifyUserIds(
                [passengerId],
                eventId,
                NotificationCode.EVENT_UPDATED,
                EVENT_NOTIFICATION_TITLES.rideAssigned,
                EVENT_NOTIFICATION_MESSAGES.rideAssigned(event.title),
            );
        }

        return this.findOne(eventId);
    }

    private buildCreateEventInput(eventData: Omit<CreateEventDto, 'participants'>): Omit<Prisma.EventCreateInput, 'host'> {
        const { startTime, endTime, ...rest } = eventData;

        return {
            ...rest,
            startTime: new Date(startTime),
            endTime: endTime ? new Date(endTime) : null,
        };
    }

    private buildUpdateEventInput(eventData: Omit<UpdateEventDto, 'participants'>): Prisma.EventUpdateInput {
        const { startTime, endTime, ...rest } = eventData;
        const updateData: Prisma.EventUpdateInput = { ...rest };

        if (startTime !== undefined) {
            updateData.startTime = new Date(startTime);
        }

        if (endTime !== undefined) {
            updateData.endTime = endTime ? new Date(endTime) : null;
        }

        return updateData;
    }

    private buildParticipantsUpdate(
        toAdd: number[],
        toRemove: number[],
    ): Prisma.EventUpdateInput['participants'] | undefined {
        const participantsUpdate: NonNullable<Prisma.EventUpdateInput['participants']> = {};

        if (toRemove.length > 0) {
            participantsUpdate.deleteMany = { userId: { in: toRemove } };
        }

        if (toAdd.length > 0) {
            participantsUpdate.create = toAdd.map(userId => ({
                userId,
                status: InviteStatus.PENDING,
            }));
        }

        return Object.keys(participantsUpdate).length > 0 ? participantsUpdate : undefined;
    }

    private diffParticipantIds(existingParticipantIds: number[], nextParticipantIds: number[]) {
        const existingIds = new Set(existingParticipantIds);
        const nextIds = new Set(nextParticipantIds);

        return {
            toAdd: nextParticipantIds.filter(userId => !existingIds.has(userId)),
            toRemove: existingParticipantIds.filter(userId => !nextIds.has(userId)),
        };
    }

    private getParticipantUserIds(event: EventWithRelations): number[] {
        return event.participants.map(participant => participant.userId);
    }

    private getParticipant(event: EventWithRelations, userId: number) {
        return event.participants.find(participant => participant.userId === userId);
    }

    private getRideAssignment(event: EventWithRelations, passengerId: number) {
        return event.rideAssignments.find(assignment => assignment.passengerId === passengerId);
    }

    private normalizeUserIds(userIds: number[]): number[] {
        return [...new Set(userIds.map(userId => Number(userId)).filter(Number.isFinite))];
    }

    private async findEventOrThrow(id: number, userId?: number): Promise<EventWithRelations> {
        const event = await this.eventsRepo.findOne(id, userId);
        if (!event) {
            throw new NotFoundException(`Event with id ${id} not found`);
        }

        return event;
    }

    private async notifyParticipants(
        eventId: number,
        type: NotificationCode,
        title: string,
        body: string,
        status?: InviteStatus,
    ) {
        const tokens = status
            ? await this.eventsRepo.getParticipantTokensByStatus(eventId, status)
            : await this.eventsRepo.getParticipantTokens(eventId);

        if (tokens.length > 0) {
            await this.notificationsService.sendMulticast(tokens, title, body, { type, eventId: String(eventId) });
        }
    }

    private async notifyUserIds(
        userIds: number[],
        eventId: number,
        type: NotificationCode,
        title: string,
        body: string,
    ) {
        const tokens = await this.eventsRepo.getUserTokens(userIds);

        if (tokens.length > 0) {
            await this.notificationsService.sendMulticast(tokens, title, body, { type, eventId: String(eventId) });
        }
    }
}
