import { Injectable, Logger } from '@nestjs/common';

import ffmpeg from 'fluent-ffmpeg';

@Injectable()
export class MediaProcessorService {
    private readonly logger = new Logger(MediaProcessorService.name);

    async processImage(inputPath: string, outputPath: string): Promise<void> {
        /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        // @ts-expect-error Bun.Image is not in the types yet
        await new Bun.Image(inputPath)
            .resize(1920, 1920, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .write(outputPath);
        /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }

    async processVideo(inputPath: string, outputPath: string): Promise<void> {
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
                    this.logger.error(`Error processing video: ${err.message}`);
                    reject(err);
                })
                .on('end', () => {
                    resolve();
                })
                .save(outputPath);
        });
    }
}
