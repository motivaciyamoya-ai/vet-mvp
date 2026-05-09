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
    description: 'До 8 URL из POST /api/uploads/thread-image (/uploads/thread/…) — сохраняются в теле поста отдельными строками.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  attachmentUrls?: string[];
}
