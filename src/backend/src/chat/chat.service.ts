import { Injectable, Inject, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ChatRepository, ChatMessageWithRelations, ReactionSummary } from './chat.repository.js';
import { EventsRepository } from '../events/events.repository.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { InviteStatus, ChatMediaType } from '../../prisma/generated/client.js';
import * as path from 'path';

export type ChatMessagePayload = {
    id: number;
    eventId: number;
    authorId: number;
    authorUsername: string;
    text: string | null;
    mediaUrl: string | null;
    mediaType: ChatMediaType | null;
    reactions: ReactionSummary[];
    isPinned: boolean;
    createdAt: Date;
    isEdited: boolean;
    updatedAt: Date;
};

export type ChatEditedMessagePayload = ChatMessagePayload & {
    isEdited: boolean;
    updatedAt: Date;
};

@Injectable()
export class ChatService {
    constructor(
        @Inject(ChatRepository) private readonly chatRepo: ChatRepository,
        @Inject(EventsRepository) private readonly eventsRepo: EventsRepository,
        @Inject(NotificationsService) private readonly notificationsService: NotificationsService
    ) {}

    async isParticipant(eventId: number, userId: number): Promise<boolean> {
        const event = await this.eventsRepo.findById(eventId);
        if (!event) {
            return false;
        }

        if (event.hostId === userId) {
            return true;
        }

        const attendance = event.participants.find((participant) => participant.userId === userId);
        return attendance?.status === InviteStatus.ACCEPTED;
    }

    async sendMessage(
        userId: number,
        eventId: number,
        text?: string | null,
        mediaUrl?: string | null,
        mediaType?: ChatMediaType | null,
        connectedUserIds: Set<number> = new Set()
    ): Promise<ChatMessagePayload> {
        const isParticipant = await this.isParticipant(eventId, userId);
        if (!isParticipant) {
            throw new ForbiddenException('Not a participant');
        }

        const message = await this.chatRepo.createMessage({
            eventId,
            authorId: userId,
            text: text?.trim() ? text.trim() : null,
            mediaUrl: mediaUrl ?? null,
            mediaType: mediaType ?? null
        });

        await this.sendPushNotification(message, connectedUserIds);
        return this.toMessagePayload(message);
    }

    async getHistory(eventId: number, userId: number, cursor?: number, limit = 50) {
        const isParticipant = await this.isParticipant(eventId, userId);
        if (!isParticipant) {
            throw new ForbiddenException('Not a participant');
        }

        const { messages, hasMore } = await this.chatRepo.findMessagePage(eventId, limit, cursor);

        return {
            messages: messages.map((message) => this.toMessagePayload(message)),
            nextCursor: hasMore && messages.length > 0 ? messages[messages.length - 1].id : null
        };
    }

    async getPinnedMessages(eventId: number, userId: number): Promise<ChatMessagePayload[]> {
        const isParticipant = await this.isParticipant(eventId, userId);
        if (!isParticipant) {
            throw new ForbiddenException('Not a participant');
        }

        const messages = await this.chatRepo.findPinnedMessages(eventId);
        return messages.map((message) => this.toMessagePayload(message));
    }

    async getMessageById(messageId: number): Promise<ChatMessageWithRelations | null> {
        return this.chatRepo.findMessageById(messageId);
    }

    async toggleReaction(
        messageId: number,
        userId: number,
        emoji: string,
        joinedEventId: number
    ): Promise<{ messageId: number; reactions: ReactionSummary[]; eventId: number }> {
        if (!emoji.trim()) {
            throw new BadRequestException('Emoji is required');
        }

        const message = await this.chatRepo.findMessageById(messageId);
        if (!message) {
            throw new NotFoundException('Message not found');
        }

        if (message.eventId !== joinedEventId) {
            throw new ForbiddenException('Message does not belong to the joined event');
        }

        const isParticipant = await this.isParticipant(message.eventId, userId);
        if (!isParticipant) {
            throw new ForbiddenException('Not a participant');
        }

        const reactions = await this.chatRepo.toggleReaction(messageId, userId, emoji.trim());
        return {
            messageId,
            reactions,
            eventId: message.eventId
        };
    }

    async pinMessage(messageId: number, userId: number, isAdmin: boolean): Promise<ChatMessageWithRelations> {
        const message = await this.chatRepo.findMessageById(messageId);
        if (!message) {
            throw new NotFoundException('Message not found');
        }

        const event = await this.eventsRepo.findById(message.eventId);
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (event.hostId !== userId && !isAdmin) {
            throw new ForbiddenException('Only host or admin can pin messages');
        }

        return this.chatRepo.updateMessage(messageId, { isPinned: true });
    }

    async unpinMessage(messageId: number, userId: number, isAdmin: boolean): Promise<ChatMessageWithRelations> {
        const message = await this.chatRepo.findMessageById(messageId);
        if (!message) {
            throw new NotFoundException('Message not found');
        }

        const event = await this.eventsRepo.findById(message.eventId);
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (event.hostId !== userId && !isAdmin) {
            throw new ForbiddenException('Only host or admin can unpin messages');
        }

        return this.chatRepo.updateMessage(messageId, { isPinned: false });
    }

    async deleteMessage(messageId: number, userId: number, isAdmin: boolean): Promise<ChatMessageWithRelations> {
        const message = await this.chatRepo.findMessageById(messageId);
        if (!message) {
            throw new NotFoundException('Message not found');
        }

        const event = await this.eventsRepo.findById(message.eventId);
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (message.authorId !== userId && event.hostId !== userId && !isAdmin) {
            throw new ForbiddenException('Not authorized to delete this message');
        }

        if (message.mediaUrl) {
            const filePath = path.join(process.cwd(), message.mediaUrl);
            const f = Bun.file(filePath);
            if (await f.exists()) {
                await f.delete();
            }
        }

        await this.chatRepo.deleteMessage(messageId);
        return message;
    }

    async editMessage(messageId: number, userId: number, text: string): Promise<ChatMessageWithRelations> {
        const message = await this.chatRepo.findMessageById(messageId);
        if (!message) {
            throw new NotFoundException('Message not found');
        }

        if (message.authorId !== userId) {
            throw new ForbiddenException('Only author can edit message');
        }

        const nextText = text.trim();
        if (!nextText) {
            throw new BadRequestException('Message text cannot be empty');
        }

        if (nextText.length > 4000) {
            throw new BadRequestException('Message text is too long');
        }

        return this.chatRepo.updateMessage(messageId, {
            text: nextText,
            isEdited: true
        });
    }

    async sendPushNotification(message: ChatMessageWithRelations, connectedUserIds: Set<number>): Promise<void> {
        const event = await this.eventsRepo.findById(message.eventId);
        if (!event) {
            return;
        }

        const participantIds = [
            event.hostId,
            ...event.participants
                .filter((participant) => participant.status === InviteStatus.ACCEPTED)
                .map((participant) => participant.userId)
        ];
        const offlineParticipantIds = [...new Set(participantIds)].filter(
            (participantId) => !connectedUserIds.has(participantId)
        );

        if (offlineParticipantIds.length === 0) {
            return;
        }

        const tokens = await this.eventsRepo.getUserTokens(offlineParticipantIds);
        if (tokens.length === 0) {
            return;
        }

        const authorUsername = message.author.username;
        const body = message.text
            ? `${authorUsername}: ${this.buildPreview(message.text)}`
            : message.mediaType
              ? `${authorUsername} sent a ${message.mediaType}`
              : authorUsername;

        await this.notificationsService.sendMulticast(tokens, event.title, body, {
            type: 'CHAT_NEW_MESSAGE',
            eventId: String(message.eventId),
            messageId: String(message.id)
        });
    }

    toMessagePayload(message: ChatMessageWithRelations): ChatMessagePayload {
        return {
            id: message.id,
            eventId: message.eventId,
            authorId: message.authorId,
            authorUsername: message.author.username,
            text: message.text,
            mediaUrl: message.mediaUrl,
            mediaType: message.mediaType,
            reactions: this.groupReactions(message.reactions),
            isPinned: message.isPinned,
            createdAt: message.createdAt,
            isEdited: message.isEdited,
            updatedAt: message.updatedAt
        };
    }

    toEditedMessagePayload(message: ChatMessageWithRelations): ChatEditedMessagePayload {
        return {
            ...this.toMessagePayload(message),
            isEdited: message.isEdited,
            updatedAt: message.updatedAt
        };
    }

    toReactionPayload(messageId: number, reactions: ReactionSummary[]) {
        return {
            messageId,
            reactions
        };
    }

    private groupReactions(reactions: ChatMessageWithRelations['reactions']): ReactionSummary[] {
        const grouped = new Map<string, ReactionSummary>();

        for (const reaction of reactions) {
            const current = grouped.get(reaction.emoji);
            if (current) {
                current.count += 1;
                current.userIds.push(reaction.userId);
            } else {
                grouped.set(reaction.emoji, {
                    emoji: reaction.emoji,
                    count: 1,
                    userIds: [reaction.userId]
                });
            }
        }

        return [...grouped.values()];
    }

    private buildPreview(text: string): string {
        return text.trim().slice(0, 100);
    }
}
