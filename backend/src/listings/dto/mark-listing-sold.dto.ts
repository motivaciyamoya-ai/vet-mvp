import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class MarkListingSoldDto {
  @ApiProperty({ description: 'Id пользователя среди оставивших комментарии (не автор объявления)' })
  @IsString()
  @MinLength(1)
  buyerUserId: string;
}
