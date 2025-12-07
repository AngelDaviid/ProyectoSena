import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  Min,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventType } from '../entities/events.entity';
import { Transform, Type } from 'class-transformer';

export class CreateEventDto {
  @ApiProperty({ description: 'Título del evento' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Descripción del evento' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Ubicación del evento' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ description: 'Fecha de inicio (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Fecha de fin (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Máximo de asistentes', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxAttendees?: number;

  @ApiProperty({ description: 'Tipo de evento', enum: EventType, default: EventType.OTHER })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiProperty({ description: 'IDs de categorías', type: [Number], required: false })
  @IsOptional()
  @Transform(({ value }) => {
    console.log('🔍 [Transform categoryIds] Input value:', value, 'Type:', typeof value);

    if (value == null || value === '') {
      console.log('  ✅ Returning undefined (empty value)');
      return undefined;
    }

    if (Array.isArray(value)) {
      console.log('  ✅ Is array, converting to numbers');
      return value.map((v) => Number(v));
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          console.log('  ✅ Parsed JSON successfully:', parsed);
          return parsed.map((v) => Number(v));
        }
      } catch (e) {
        console.log('  ⚠️ JSON parse failed, trying comma split');
        const result = value
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((s: string) => Number(s));
        console.log('  ✅ Comma split result:', result);
        return result;
      }
    }

    console.log('  ⚠️ Unknown format, returning as-is');
    return value;
  })
  @ValidateIf((o) => o. categoryIds !== undefined)
  @IsArray()
  categoryIds?: number[];

  @ApiProperty({ description: 'Publicar inmediatamente (false = borrador)', required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => {
    console.log('🔍 [Transform isDraft] Input:', value, 'Type:', typeof value);

    if (typeof value === 'boolean') {
      console. log('  ✅ isDraft: boolean →', value);
      return value;
    }

    if (typeof value === 'string') {
      const result = value.toLowerCase() === 'true';
      console.log(`  ✅ isDraft: string "${value}" → boolean ${result}`);
      return result;
    }

    if (value == null) {
      console.log('  ✅ isDraft: null/undefined → false (PUBLICAR)');
      return false;
    }

    console.log('  ⚠️ isDraft: unknown format, defaulting to false');
    return false;
  })
  @IsBoolean()
  isDraft?: boolean;
}
