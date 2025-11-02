import { IsNotEmpty, IsString, IsOptional, IsUrl } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The first name of the user' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The last name of the user' })
  lastName: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  @ApiProperty({ description: 'The avatar URL of the user', required: false })
  avatar: string;
}

export class UpdateProfileDto extends PartialType(CreateProfileDto) {}
