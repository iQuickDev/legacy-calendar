import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MediaProcessorService {
    private readonly logger = new Logger(MediaProcessorService.name);

    async processImage(inputPath: string, outputPath: string): Promise<void> {
        await sharp(inputPath)
            .resize(1920, 1920, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(outputPath);
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
