import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsArray as IsArrayDecorator } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Title of the post' })
  title: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Content of the post', required: false })
  content?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Summary of the post', required: false })
  summary?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    if (Array.isArray(value)) return value.map((v) => Number(v));
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map((v) => Number(v));
      } catch (e) {
        return value
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((v: string) => Number(v));
      }
    }
    return value;
  })
  @IsNumber({}, { each: true })
  @ApiProperty({ description: 'Array of category IDs associated with the post', type: [Number], required: false })
  categoryIds?: number[];
}
