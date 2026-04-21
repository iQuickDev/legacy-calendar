import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller.js';

@Module({
    controllers: [UploadsController]
})
export class UploadsModule {}
