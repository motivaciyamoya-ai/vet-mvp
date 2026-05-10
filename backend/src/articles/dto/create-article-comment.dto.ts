import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateArticleCommentDto {
  @ApiProperty({
    description:
      'Текст комментария. Может быть пустым, если переданы attachmentUrls (тогда в БД сохранится список URL вложений).',
  })
  @IsString()
  @MaxLength(8000)
  body!: string;

  @ApiPropertyOptional({
    description: 'URL из POST /api/uploads/message-attachment (/uploads/messages/…), до лимита из настроек сайта.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}
