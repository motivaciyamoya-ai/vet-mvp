import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Допустимые значения проверяются в HomeChatService. */
export class LobbyReactDto {
  @ApiProperty({ example: '👍', description: 'Один из фиксированного набора эмодзи' })
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  emoji: string;
}
