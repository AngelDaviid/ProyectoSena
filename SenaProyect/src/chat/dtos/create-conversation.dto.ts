import { IsArray, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(2, { message: 'Una conversación necesita al menos 2 participantes' })
  @IsInt({ each: true })
  @Type(() => Number)
  participantIds: number[];
}
