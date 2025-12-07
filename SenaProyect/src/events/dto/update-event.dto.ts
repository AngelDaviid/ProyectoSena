import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './events.dto';
import { IsArray, IsOptional, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') return undefined;
    if (Array.isArray(value)) return value.map((v) => Number(v));
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map((v) => Number(v));
      } catch (e) {
        return value.split(',').map((s: string) => s.trim()).filter(Boolean).map((s: string) => Number(s));
      }
    }
    return value;
  })
  @ValidateIf((o) => o.categoryIds !== undefined)
  @IsArray()
  categoryIds?: number[];
}
