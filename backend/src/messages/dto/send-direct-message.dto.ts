import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendDirectMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}

export class OpenConversationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  initialBody?: string;
}
