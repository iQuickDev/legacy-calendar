import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseIntPipe,
    Req,
    ForbiddenException,
    UnsupportedMediaTypeException,
    BadRequestException,
    Inject
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ChatService } from './chat.service.js';
import { MediaProcessorService } from './media-processor.service.js';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { ChatMediaType } from '../../prisma/generated/client.js';

type RequestWithUser = {
    user: {
        userId: number;
    };
};

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(
        @Inject(ChatService) private readonly chatService: ChatService,
        @Inject(MediaProcessorService) private readonly mediaProcessor: MediaProcessorService
    ) {}

    @Get(':eventId/messages')
    async getHistory(
        @Param('eventId', ParseIntPipe) eventId: number,
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
        @Req() req?: RequestWithUser
    ) {
        const userId = req?.user.userId as number;
        const parsedLimit = this.parseLimit(limit);
        const parsedCursor = this.parseCursor(cursor);

        return this.chatService.getHistory(eventId, userId, parsedCursor, parsedLimit);
    }

    @Get(':eventId/pinned')
    async getPinned(@Param('eventId', ParseIntPipe) eventId: number, @Req() req?: RequestWithUser) {
        const userId = req?.user.userId as number;
        return this.chatService.getPinnedMessages(eventId, userId);
    }

    @Post(':eventId/upload')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
    async uploadFile(
        @Param('eventId', ParseIntPipe) eventId: number,
        @UploadedFile() file: Express.Multer.File,
        @Req() req?: RequestWithUser
    ) {
        const userId = req?.user.userId as number;
        const isParticipant = await this.chatService.isParticipant(eventId, userId);
        if (!isParticipant) {
            throw new ForbiddenException('Not a participant');
        }

        if (!file) {
            throw new BadRequestException('File is required');
        }

        const uploadInfo = this.resolveMediaUpload(file);
        const uploadDir = path.join(process.cwd(), 'uploads', 'chat', eventId.toString());
        fs.mkdirSync(uploadDir, { recursive: true });

        const fileName = `${uuidv4()}${uploadInfo.ext}`;
        const filePath = path.join(uploadDir, fileName);
        const tempPath = path.join(uploadDir, `temp_${fileName}`);

        if (uploadInfo.mediaType === ChatMediaType.image) {
            fs.writeFileSync(tempPath, file.buffer);
            try {
                await this.mediaProcessor.processImage(tempPath, filePath);
            } finally {
                this.removeIfExists(tempPath);
            }
        } else if (uploadInfo.mediaType === ChatMediaType.video) {
            fs.writeFileSync(tempPath, file.buffer);
            try {
                await this.mediaProcessor.processVideo(tempPath, filePath);
            } finally {
                this.removeIfExists(tempPath);
            }
        } else {
            fs.writeFileSync(filePath, file.buffer);
        }

        return {
            mediaUrl: `uploads/chat/${eventId}/${fileName}`,
            mediaType: uploadInfo.mediaType
        };
    }

    private parseLimit(limit?: string): number {
        if (!limit) {
            return 50;
        }

        const parsed = Number(limit);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return 50;
        }

        return Math.min(parsed, 100);
    }

    private parseCursor(cursor?: string): number | undefined {
        if (!cursor) {
            return undefined;
        }

        const parsed = Number(cursor);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }

    private resolveMediaUpload(file: Express.Multer.File): { mediaType: ChatMediaType; ext: string } {
        const mimeType = file.mimetype;
        const originalExt = path.extname(file.originalname).toLowerCase();

        if (mimeType === 'image/gif') {
            return {
                mediaType: ChatMediaType.gif,
                ext: originalExt || '.gif'
            };
        }

        if (mimeType.startsWith('image/')) {
            return {
                mediaType: ChatMediaType.image,
                ext: '.jpg'
            };
        }

        if (mimeType.startsWith('video/')) {
            return {
                mediaType: ChatMediaType.video,
                ext: '.mp4'
            };
        }

        if (mimeType.startsWith('audio/')) {
            return {
                mediaType: ChatMediaType.audio,
                ext: originalExt || this.extensionFromMime(mimeType) || '.bin'
            };
        }

        throw new UnsupportedMediaTypeException('Unsupported media type');
    }

    private extensionFromMime(mimeType: string): string | undefined {
        if (mimeType === 'audio/mpeg') {
            return '.mp3';
        }

        if (mimeType === 'audio/mp4') {
            return '.m4a';
        }

        if (mimeType === 'audio/wav') {
            return '.wav';
        }

        return undefined;
    }

    private removeIfExists(filePath: string) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
