import {IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

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
  @ApiProperty({ description: 'Cover image URL of the post', required: false })
  coverImage?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Summary of the post', required: false })
  summary?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  @ApiProperty({ description: 'Array of category IDs associated with the post', type: [Number], required: false })
  categoryIds?: number[];
}
