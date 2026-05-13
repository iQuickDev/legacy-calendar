import { Injectable } from '@nestjs/common';

import ffmpeg from 'fluent-ffmpeg';
import { AppLogger } from '../logging/app-logger.js';

@Injectable()
export class MediaProcessorService {
    private readonly logger = new AppLogger(MediaProcessorService.name);

    async processImage(inputPath: string, outputPath: string): Promise<void> {
        this.logger.debug('Processing chat image', { inputPath, outputPath });
        await new Bun.Image(inputPath)
            .resize(1920, 1920, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .write(outputPath);
    }

    async processVideo(inputPath: string, outputPath: string): Promise<void> {
        this.logger.debug('Processing chat video', { inputPath, outputPath });
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-vcodec libx264',
                    '-crf 28',
                    '-preset fast',
                    '-vf scale=w=1280:h=720:force_original_aspect_ratio=decrease',
                    '-acodec aac'
                ])
                .toFormat('mp4')
                .on('error', (err) => {
                    this.logger.error(
                        'Error processing video',
                        err instanceof Error ? (err.stack ?? err.message) : String(err)
                    );
                    reject(err);
                })
                .on('end', () => {
                    this.logger.info('Chat video processed', { inputPath, outputPath });
                    resolve();
                })
                .save(outputPath);
        });
    }
}
