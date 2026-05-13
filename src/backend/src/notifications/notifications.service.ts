import { Injectable, OnModuleInit, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service.js';
import * as path from 'path';
import { AppLogger } from '../logging/app-logger.js';
import { NotificationCode } from './notification-codes.js';

@Injectable()
export class NotificationsService implements OnModuleInit {
    private readonly logger = new AppLogger(NotificationsService.name);
    private initialized = false;

    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async onModuleInit() {
        await this.initializeFirebase();
    }

    private async initializeFirebase() {
        const firebaseConfigPath = path.join(process.cwd(), 'firebase.json');

        if (await Bun.file(firebaseConfigPath).exists()) {
            try {
                admin.initializeApp({
                    credential: admin.credential.cert(firebaseConfigPath)
                });
                this.initialized = true;
                this.logger.info('Firebase Admin initialized successfully using firebase.json');
            } catch (error) {
                this.logger.fatal(
                    'Failed to initialize Firebase Admin with firebase.json',
                    error instanceof Error ? error : String(error)
                );
            }
        } else {
            this.logger.warn(
                'Firebase credentials file (firebase.json) not found at root. Notifications will not be sent.'
            );
        }
    }

    async subscribe(userId: number, token: string): Promise<void> {
        this.logger.info('Subscribing FCM token', { userId });
        await this.prisma.fcmToken.deleteMany({
            where: { token }
        });

        await this.prisma.fcmToken.create({
            data: {
                token,
                userId
            }
        });
        this.logger.debug('FCM token subscribed', { userId });
    }

    async unsubscribe(token: string): Promise<void> {
        this.logger.info('Unsubscribing FCM token');
        await this.prisma.fcmToken.deleteMany({
            where: { token }
        });
        this.logger.debug('FCM token unsubscribed');
    }

    async sendNotification(token: string, title: string, body: string, data?: Record<string, string>) {
        const payloadData = this.buildPayloadData(title, body, data);
        this.validateNotificationData(payloadData);
        if (!this.initialized) {
            this.logger.warn('Firebase not initialized, skipping notification');
            return;
        }

        try {
            await admin.messaging().send({
                token,
                data: payloadData
            });
            this.logger.info('Notification sent', { token, title, dataKeys: Object.keys(payloadData) });
        } catch (error) {
            this.logger.error(
                'Failed to send notification',
                error instanceof Error ? (error.stack ?? error.message) : String(error)
            );
        }
    }

    async sendMulticast(tokens: string[], title: string, body: string, data?: Record<string, string>) {
        const payloadData = this.buildPayloadData(title, body, data);
        this.validateNotificationData(payloadData);
        if (!this.initialized || tokens.length === 0) {
            this.logger.debug('Skipping multicast notification', {
                initialized: this.initialized,
                tokenCount: tokens.length
            });
            return;
        }

        try {
            const response = await admin.messaging().sendEachForMulticast({
                tokens,
                data: payloadData
            });
            this.logger.info('Multicast notification sent', {
                successCount: response.successCount,
                failureCount: response.failureCount,
                tokenCount: tokens.length,
                title
            });
        } catch (error) {
            this.logger.error(
                'Failed to send multicast notifications',
                error instanceof Error ? (error.stack ?? error.message) : String(error)
            );
        }
    }

    async getMutedEventIds(userId: number): Promise<number[]> {
        const mutes = await this.prisma.chatMute.findMany({
            where: { userId },
            select: { eventId: true },
            orderBy: { eventId: 'asc' }
        });

        return mutes.map((mute) => mute.eventId);
    }

    async getMutedUserIdsForEvent(eventId: number, userIds: number[]): Promise<number[]> {
        if (userIds.length === 0) {
            return [];
        }

        const mutes = await this.prisma.chatMute.findMany({
            where: {
                eventId,
                userId: { in: userIds }
            },
            select: { userId: true }
        });

        return mutes.map((mute) => mute.userId);
    }

    async createChatMute(userId: number, eventId: number): Promise<boolean> {
        await this.assertCanModifyChatMute(userId, eventId);

        const existing = await this.prisma.chatMute.findUnique({
            where: {
                userId_eventId: {
                    userId,
                    eventId
                }
            }
        });

        if (existing) {
            return false;
        }

        await this.prisma.chatMute.create({
            data: {
                userId,
                eventId
            }
        });

        return true;
    }

    async removeChatMute(userId: number, eventId: number): Promise<boolean> {
        await this.assertCanModifyChatMute(userId, eventId);

        const existing = await this.prisma.chatMute.findUnique({
            where: {
                userId_eventId: {
                    userId,
                    eventId
                }
            }
        });

        if (!existing) {
            return false;
        }

        await this.prisma.chatMute.delete({
            where: {
                userId_eventId: {
                    userId,
                    eventId
                }
            }
        });

        return true;
    }

    private validateNotificationData(data?: Record<string, string>) {
        const type = data?.type;
        if (!type || !Object.values(NotificationCode).includes(type as NotificationCode)) {
            throw new Error('Notification data payload must include a valid type');
        }
    }

    private buildPayloadData(title: string, body: string, data?: Record<string, string>) {
        return {
            title,
            body,
            ...data
        };
    }

    private async assertCanModifyChatMute(userId: number, eventId: number): Promise<void> {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                hostId: true,
                participants: {
                    where: { userId },
                    select: { id: true }
                }
            }
        });

        if (!event) {
            throw new NotFoundException(`Event with id ${eventId} not found`);
        }

        const canModify = event.hostId === userId || event.participants.length > 0;
        if (!canModify) {
            throw new ForbiddenException('You can only change mute preferences for events you participate in');
        }
    }
}
