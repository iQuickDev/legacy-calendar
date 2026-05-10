import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    ConnectedSocket,
    MessageBody
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatMediaType } from '../../prisma/generated/client.js';
import { ChatService } from './chat.service.js';
import { HttpException } from '@nestjs/common';

type SocketUser = {
    userId: number;
    username: string;
    isAdmin: boolean;
};

@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(ChatGateway.name);

    constructor(
        @Inject(ChatService) private readonly chatService: ChatService,
        @Inject(JwtService) private readonly jwtService: JwtService,
        @Inject(ConfigService) private readonly configService: ConfigService
    ) {}

    afterInit(server: Server) {
        server.use((socket, next) => {
            this.authenticateSocket(socket, next);
        });
    }

    handleConnection(client: Socket) {
        const user = this.getSocketUser(client);
        if (user) {
            this.logger.log(`Client connected: ${client.id} (User: ${user.username})`);
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody('eventId') eventIdInput: number) {
        const eventId = this.parseEventId(eventIdInput);
        if (eventId === null) {
            client.emit('error', { code: 400, message: 'Invalid eventId' });
            return;
        }

        const user = this.requireSocketUser(client);
        const isParticipant = await this.chatService.isParticipant(eventId, user.userId);
        const roomName = `chat:${eventId}`;

        if (!isParticipant) {
            client.emit('error', { code: 403, message: 'Forbidden' });
            client.leave(roomName);
            return;
        }

        client.join(roomName);
        this.logger.log(`User ${user.userId} joined room ${roomName}`);
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody('eventId') eventIdInput: number) {
        const eventId = this.parseEventId(eventIdInput);
        if (eventId === null) {
            return;
        }

        client.leave(`chat:${eventId}`);
    }

    @SubscribeMessage('sendMessage')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { eventId: number; text?: string; mediaUrl?: string; mediaType?: ChatMediaType }
    ) {
        const user = this.requireSocketUser(client);
        const eventId = this.parseEventId(data.eventId);
        if (eventId === null) {
            client.emit('error', { code: 400, message: 'Invalid eventId' });
            return;
        }

        const text = typeof data.text === 'string' ? data.text.trim() : '';
        const mediaUrl = typeof data.mediaUrl === 'string' && data.mediaUrl.trim() ? data.mediaUrl.trim() : null;
        const mediaType = this.isChatMediaType(data.mediaType) ? data.mediaType : null;

        if (!text && !mediaUrl) {
            client.emit('error', { code: 400, message: 'Message must contain text or media' });
            return;
        }

        if (text.length > 4000) {
            client.emit('error', { code: 400, message: 'Message too long' });
            return;
        }

        if (mediaUrl && !mediaType) {
            client.emit('error', { code: 400, message: 'Invalid media type' });
            return;
        }

        try {
            const roomName = `chat:${eventId}`;
            const connectedUserIds = this.getConnectedUserIds(roomName);
            const message = await this.chatService.sendMessage(
                user.userId,
                eventId,
                text || null,
                mediaUrl,
                mediaType,
                connectedUserIds
            );
            this.server.to(roomName).emit('newMessage', message);
        } catch (error) {
            this.emitSocketError(client, error);
        }
    }

    @SubscribeMessage('addReaction')
    async handleAddReaction(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { messageId: number; emoji: string }
    ) {
        const user = this.requireSocketUser(client);
        const messageId = this.parseEventId(data.messageId);
        const emoji = typeof data.emoji === 'string' ? data.emoji.trim() : '';

        if (messageId === null || !emoji) {
            client.emit('error', { code: 400, message: 'Invalid reaction payload' });
            return;
        }

        try {
            const message = await this.chatService.getMessageById(messageId);
            if (!message) {
                client.emit('error', { code: 404, message: 'Message not found' });
                return;
            }

            if (!this.isJoinedToEvent(client, message.eventId)) {
                client.emit('error', { code: 403, message: 'Forbidden' });
                return;
            }

            const reaction = await this.chatService.toggleReaction(messageId, user.userId, emoji, message.eventId);
            this.server
                .to(`chat:${reaction.eventId}`)
                .emit('reactionUpdated', this.chatService.toReactionPayload(reaction.messageId, reaction.reactions));
        } catch (error) {
            this.emitSocketError(client, error);
        }
    }

    @SubscribeMessage('pinMessage')
    async handlePinMessage(@ConnectedSocket() client: Socket, @MessageBody('messageId') messageIdInput: number) {
        const user = this.requireSocketUser(client);
        const messageId = this.parseEventId(messageIdInput);
        if (messageId === null) {
            client.emit('error', { code: 400, message: 'Invalid messageId' });
            return;
        }

        try {
            const message = await this.chatService.pinMessage(messageId, user.userId, user.isAdmin);
            this.server.to(`chat:${message.eventId}`).emit('messagePinned', { messageId });
        } catch (error) {
            this.emitSocketError(client, error);
        }
    }

    @SubscribeMessage('unpinMessage')
    async handleUnpinMessage(@ConnectedSocket() client: Socket, @MessageBody('messageId') messageIdInput: number) {
        const user = this.requireSocketUser(client);
        const messageId = this.parseEventId(messageIdInput);
        if (messageId === null) {
            client.emit('error', { code: 400, message: 'Invalid messageId' });
            return;
        }

        try {
            const message = await this.chatService.unpinMessage(messageId, user.userId, user.isAdmin);
            this.server.to(`chat:${message.eventId}`).emit('messageUnpinned', { messageId });
        } catch (error) {
            this.emitSocketError(client, error);
        }
    }

    @SubscribeMessage('deleteMessage')
    async handleDeleteMessage(@ConnectedSocket() client: Socket, @MessageBody('messageId') messageIdInput: number) {
        const user = this.requireSocketUser(client);
        const messageId = this.parseEventId(messageIdInput);
        if (messageId === null) {
            client.emit('error', { code: 400, message: 'Invalid messageId' });
            return;
        }

        try {
            const message = await this.chatService.deleteMessage(messageId, user.userId, user.isAdmin);
            this.server.to(`chat:${message.eventId}`).emit('messageDeleted', { messageId });
        } catch (error) {
            this.emitSocketError(client, error);
        }
    }

    @SubscribeMessage('editMessage')
    async handleEditMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { messageId: number; text: string }
    ) {
        const user = this.requireSocketUser(client);
        const messageId = this.parseEventId(data.messageId);
        const text = typeof data.text === 'string' ? data.text.trim() : '';

        if (messageId === null) {
            client.emit('error', { code: 400, message: 'Invalid messageId' });
            return;
        }

        if (!text) {
            client.emit('error', { code: 400, message: 'Message text cannot be empty' });
            return;
        }

        if (text.length > 4000) {
            client.emit('error', { code: 400, message: 'Message too long' });
            return;
        }

        try {
            const message = await this.chatService.editMessage(messageId, user.userId, text);
            this.server
                .to(`chat:${message.eventId}`)
                .emit('messageEdited', this.chatService.toEditedMessagePayload(message));
        } catch (error) {
            this.emitSocketError(client, error);
        }
    }

    @SubscribeMessage('typing')
    handleTyping(@ConnectedSocket() client: Socket, @MessageBody('eventId') eventIdInput: number) {
        const eventId = this.parseEventId(eventIdInput);
        if (eventId === null) {
            return;
        }

        const user = this.requireSocketUser(client);
        client.to(`chat:${eventId}`).emit('userTyping', {
            userId: user.userId,
            username: user.username
        });
    }

    @SubscribeMessage('stopTyping')
    handleStopTyping(@ConnectedSocket() client: Socket, @MessageBody('eventId') eventIdInput: number) {
        const eventId = this.parseEventId(eventIdInput);
        if (eventId === null) {
            return;
        }

        const user = this.requireSocketUser(client);
        client.to(`chat:${eventId}`).emit('userStoppedTyping', {
            userId: user.userId,
            username: user.username
        });
    }

    private async authenticateSocket(socket: Socket, next: (err?: Error) => void) {
        try {
            const token = this.extractHandshakeToken(socket);
            if (!token) {
                next(this.buildHandshakeError(401, 'Unauthorized'));
                return;
            }

            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.getOrThrow<string>('JWT_SECRET')
            });
            const user: SocketUser = {
                userId: Number(payload.userId ?? payload.sub),
                username: String(payload.username ?? ''),
                isAdmin: Boolean(payload.isAdmin)
            };

            if (!Number.isFinite(user.userId) || !user.username) {
                next(this.buildHandshakeError(401, 'Unauthorized'));
                return;
            }

            socket.data.user = user;
            next();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Socket authentication failed: ${message}`);
            next(this.buildHandshakeError(401, 'Unauthorized'));
        }
    }

    private extractHandshakeToken(socket: Socket): string | null {
        const authToken = socket.handshake.auth?.token;
        const headerToken = socket.handshake.headers.authorization;
        const rawToken =
            typeof authToken === 'string' ? authToken : typeof headerToken === 'string' ? headerToken : null;

        if (!rawToken) {
            return null;
        }

        return rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
    }

    private buildHandshakeError(code: number, message: string): Error {
        const error = new Error(message);
        (error as Error & { data?: { code: number } }).data = { code };
        return error;
    }

    private emitSocketError(client: Socket, error: unknown) {
        const status = this.getErrorStatus(error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        client.emit('error', { code: status, message });
    }

    private getErrorStatus(error: unknown): number {
        if (error instanceof HttpException) {
            return error.getStatus();
        }

        if (typeof error === 'object' && error !== null) {
            const candidate = error as { status?: number; code?: number };
            if (typeof candidate.status === 'number') {
                return candidate.status;
            }
            if (typeof candidate.code === 'number') {
                return candidate.code;
            }
        }

        return 500;
    }

    private getSocketUser(client: Socket): SocketUser | undefined {
        return client.data.user as SocketUser | undefined;
    }

    private requireSocketUser(client: Socket): SocketUser {
        const user = this.getSocketUser(client);
        if (!user) {
            throw new Error('Socket is not authenticated');
        }

        return user;
    }

    private parseEventId(value: unknown): number | null {
        const parsed = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    private isChatMediaType(value: unknown): value is ChatMediaType {
        return (
            value === ChatMediaType.image ||
            value === ChatMediaType.gif ||
            value === ChatMediaType.video ||
            value === ChatMediaType.audio
        );
    }

    private isJoinedToEvent(client: Socket, eventId: number): boolean {
        return client.rooms.has(`chat:${eventId}`);
    }

    private getConnectedUserIds(roomName: string): Set<number> {
        const sockets = this.server.sockets.adapter.rooms.get(roomName);
        const userIds = new Set<number>();

        if (!sockets) {
            return userIds;
        }

        for (const socketId of sockets) {
            const socket = this.server.sockets.sockets.get(socketId);
            const user = socket?.data.user as SocketUser | undefined;
            if (user) {
                userIds.add(user.userId);
            }
        }

        return userIds;
    }
}
