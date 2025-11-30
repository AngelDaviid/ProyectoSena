import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './events.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {}
