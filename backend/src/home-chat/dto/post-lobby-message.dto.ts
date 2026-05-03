import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PostLobbyMessageDto {
  @ApiProperty({ maxLength: 1600 })
  @IsString()
  @MinLength(1)
  @MaxLength(1600)
  body: string;
}
