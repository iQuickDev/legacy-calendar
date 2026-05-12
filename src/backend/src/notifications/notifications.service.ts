import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service.js';
import * as path from 'path';
import { AppLogger } from '../logging/app-logger.js';

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
                this.logger.fatal('Failed to initialize Firebase Admin with firebase.json', error instanceof Error ? error : String(error));
            }
        } else {
            this.logger.warn('Firebase credentials file (firebase.json) not found at root. Notifications will not be sent.');
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
        if (!this.initialized) {
            this.logger.warn('Firebase not initialized, skipping notification');
            return;
        }

        try {
            await admin.messaging().send({
                token,
                notification: {
                    title,
                    body
                },
                data
            });
            this.logger.info('Notification sent', { token, title, dataKeys: data ? Object.keys(data) : [] });
        } catch (error) {
            this.logger.error('Failed to send notification', error instanceof Error ? error.stack ?? error.message : String(error));
        }
    }

    async sendMulticast(tokens: string[], title: string, body: string, data?: Record<string, string>) {
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
                notification: {
                    title,
                    body
                },
                data
            });
            this.logger.info('Multicast notification sent', {
                successCount: response.successCount,
                failureCount: response.failureCount,
                tokenCount: tokens.length,
                title
            });
        } catch (error) {
            this.logger.error('Failed to send multicast notifications', error instanceof Error ? error.stack ?? error.message : String(error));
        }
    }
}
