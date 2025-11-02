import {IsNotEmpty, IsString} from "class-validator";
import {PartialType} from "@nestjs/swagger";


export class CreateCategoryEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateCategoryEventDto extends PartialType(CreateCategoryEventDto) {
}
