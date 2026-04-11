import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Event, InviteStatus } from '@prisma/client';
import { ParticipateDto } from './dto/participate.dto';

@Injectable()
export class EventsRepository {
    constructor(private readonly prisma: PrismaService) { }

    private eventInclude() {
        return {
            host: { select: { id: true, username: true, profilePicture: true } },
            participants: {
                include: {
                    user: { select: { id: true, username: true, profilePicture: true } },
                }
            },
            rideAssignments: {
                include: {
                    driver: { select: { id: true, username: true, profilePicture: true } },
                    passenger: { select: { id: true, username: true, profilePicture: true } },
                }
            }
        };
    }

    async create(data: Prisma.EventCreateInput): Promise<Event> {
        return this.prisma.event.create({ data });
    }

    async getUserById(id: number) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async findAll(): Promise<Event[]> {
        return this.prisma.event.findMany({
            include: this.eventInclude(),
        });
    }

    async findOne(id: number): Promise<Event | null> {
        return this.prisma.event.findUnique({
            where: { id },
            include: this.eventInclude(),
        });
    }

    async remove(id: number): Promise<Event> {
        return this.prisma.event.delete({ where: { id } });
    }

    async join(userId: number, eventId: number, participateDto: any) {
        const { wantsFood, wantsWeed, wantsSleep, wantsAlcohol, wantsBeer, hasVehicle, vehicleType, vehicleSeats } = participateDto;

        return this.prisma.attendance.upsert({
            where: {
                userId_eventId: { userId, eventId }
            },
            update: {
                status: 'ACCEPTED',
                wantsFood,
                wantsWeed,
                wantsSleep,
                wantsAlcohol,
                wantsBeer,
                hasVehicle,
                vehicleType,
                vehicleSeats,
            },
            create: {
                userId,
                eventId,
                status: 'ACCEPTED',
                wantsFood,
                wantsWeed,
                wantsSleep,
                wantsAlcohol,
                wantsBeer,
                hasVehicle,
                vehicleType,
                vehicleSeats,
            },
        });
    }

    async assignRide(eventId: number, passengerId: number, driverId: number | null) {
        if (driverId === null) {
            return this.prisma.rideAssignment.deleteMany({
                where: {
                    eventId,
                    passengerId,
                }
            });
        }

        return this.prisma.rideAssignment.upsert({
            where: {
                eventId_passengerId: { eventId, passengerId }
            },
            update: {
                driverId,
            },
            create: {
                eventId,
                passengerId,
                driverId,
            },
        });
    }

    async deleteRideAssignmentsForUsers(eventId: number, userIds: number[]) {
        if (userIds.length === 0) {
            return { count: 0 };
        }

        return this.prisma.rideAssignment.deleteMany({
            where: {
                eventId,
                OR: [
                    { passengerId: { in: userIds } },
                    { driverId: { in: userIds } },
                ],
            }
        });
    }

    async leave(userId: number, eventId: number) {
        return this.prisma.attendance.delete({
            where: {
                userId_eventId: { userId, eventId }
            }
        });
    }

    async update(id: number, data: any): Promise<Event> {
        return this.prisma.event.update({
            where: { id },
            data,
            include: this.eventInclude(),
        });
    }


    async inviteUser(eventId: number, username: string) {
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user) {
            return null;
        }

        const existing = await this.prisma.attendance.findUnique({
            where: { userId_eventId: { userId: user.id, eventId } }
        });

        if (existing) return user;

        await this.prisma.attendance.create({
            data: {
                userId: user.id,
                eventId,
                status: 'PENDING',
            },
        });

        return user;
    }

    async getParticipantTokens(eventId: number): Promise<string[]> {
        const attendances = await this.prisma.attendance.findMany({
            where: { eventId },
            include: { user: { include: { fcmTokens: true } } },
        });

        return attendances.flatMap((a) => a.user.fcmTokens.map((t) => t.token));
    }

    async getParticipantTokensByStatus(eventId: number, status: InviteStatus): Promise<string[]> {
        const attendances = await this.prisma.attendance.findMany({
            where: { eventId, status },
            include: { user: { include: { fcmTokens: true } } },
        });

        return attendances.flatMap((a) => a.user.fcmTokens.map((t) => t.token));
    }

    async getUserTokens(userIds: number[]): Promise<string[]> {
        const tokens = await this.prisma.fcmToken.findMany({
            where: { userId: { in: userIds } },
            select: { token: true },
        });

        return tokens.map((t) => t.token);
    }
}
