import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({
    description: 'Текст сообщения. Может быть пустым, если указаны attachmentUrls (тогда в БД сохранится список URL).',
  })
  @IsString()
  @MaxLength(20000)
  body: string;

  @ApiPropertyOptional({
    description:
      'URL вложений: POST /api/uploads/thread-image (/uploads/thread/…) и/или POST /api/uploads/message-attachment (/uploads/messages/…). Максимум строк задаётся в админке (`uploads.forum.max_attachment_lines`, по умолчанию 10).',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  attachmentUrls?: string[];
}
