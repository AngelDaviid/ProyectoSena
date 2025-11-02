import {IsString, IsNotEmpty, MaxLength} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({description: 'Name of the category'})
  name: string;
}
