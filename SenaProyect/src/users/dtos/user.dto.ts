import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';

import { CreateProfileDto, UpdateProfileDto } from './profile.dto';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({ description: 'The username of the user', minLength: 8 })
  password: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: 'The email of the user' })
  email: string;

  @ValidateNested()
  @Type(() => CreateProfileDto)
  @IsNotEmpty()
  @ApiProperty({ description: 'The profile of the user' })
  profile: CreateProfileDto;

  @IsOptional()
  @IsIn(['desarrollador', 'instructor', 'aprendiz'])
  @ApiProperty({ description: 'Role of the user', enum: ['desarrollador', 'instructor', 'aprendiz'], required: false })
  role?: 'desarrollador' | 'instructor' | 'aprendiz';
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['profile'])) {
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  @IsOptional()
  @ApiProperty({ description: 'The updated profile of the user', required: false })
  profile: UpdateProfileDto;
}
