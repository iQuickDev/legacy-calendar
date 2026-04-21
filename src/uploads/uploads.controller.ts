import { Controller, Get, Param, Req, Res, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { join } from 'path';
import { existsSync, createReadStream, statSync } from 'fs';
import { lookup } from 'mime-types';

@Controller('uploads')
export class UploadsController {
    constructor(private configService: ConfigService) {}

    @Get(':category/:filename')
    getUpload(
        @Param('category') category: string,
        @Param('filename') filename: string,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const filePath = join(process.cwd(), 'uploads', category, filename);

        if (existsSync(filePath)) {
            const stat = statSync(filePath);
            const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;

            res.set('ETag', etag);
            res.set('Cache-Control', 'no-cache');

            const contentType = lookup(filename) || 'application/octet-stream';
            res.set('Content-Type', contentType);

            if (req.headers['if-none-match'] === etag) {
                res.status(304).end();
                return;
            }

            res.set('Content-Length', stat.size.toString());
            const file = createReadStream(filePath);
            file.pipe(res);
            return;
        }

        const remoteUrl = this.configService.get<string>('REMOTE_UPLOADS_URL');
        if (remoteUrl) {
            const sanitizedRemoteUrl = remoteUrl.endsWith('/') ? remoteUrl.slice(0, -1) : remoteUrl;
            return res.redirect(`${sanitizedRemoteUrl}/uploads/${category}/${filename}`);
        }

        throw new NotFoundException('File not found');
    }
}
