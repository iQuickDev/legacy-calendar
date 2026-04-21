import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto.js';

export class UpdateEventDto extends PartialType(CreateEventDto) {}
