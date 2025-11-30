import { IsString, IsNotEmpty, IsDateString, IsOptional, IsInt, IsEnum, IsArray, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventType } from '../entities/events.entity';
import { Type } from 'class-transformer';

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
  @IsArray()
  @Type(() => Number)
  categoryIds?: number[];

  @ApiProperty({ description: 'Publicar inmediatamente (false = borrador)', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDraft?: boolean;
}
