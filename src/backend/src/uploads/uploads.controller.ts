import { Controller, Get, Req, Res, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import * as path from 'path';
import { existsSync, createReadStream, statSync } from 'fs';
import { lookup } from 'mime-types';

@Controller('uploads')
export class UploadsController {
    constructor(@Inject(ConfigService) private configService: ConfigService) {}

    @Get('*path')
    getUpload(@Req() req: Request, @Res() res: Response) {
        const relativePath = req.path.replace(/^\/uploads\/?/, '');
        const uploadsRoot = path.join(process.cwd(), 'uploads');
        const filePath = path.normalize(path.join(uploadsRoot, relativePath));

        if (!filePath.startsWith(`${uploadsRoot}${path.sep}`) && filePath !== uploadsRoot) {
            throw new NotFoundException('File not found');
        }

        if (existsSync(filePath)) {
            const stat = statSync(filePath);
            const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;

            res.set('ETag', etag);
            res.set('Cache-Control', 'no-cache');

            const contentType = lookup(path.basename(filePath)) || 'application/octet-stream';
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
            return res.redirect(`${sanitizedRemoteUrl}/uploads/${relativePath}`);
        }

        throw new NotFoundException('File not found');
    }
}
