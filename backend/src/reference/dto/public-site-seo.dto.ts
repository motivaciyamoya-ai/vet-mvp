import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicSiteSeoDto {
  @ApiProperty({ example: 'VetConnect' })
  siteName!: string;

  /** Готовое значение для `<title>` на главной странице. */
  @ApiProperty()
  homeDocumentTitle!: string;

  @ApiProperty({ description: 'По умолчанию для `<meta name="description">` на главной и как запасной вариант.' })
  metaDescription!: string;

  @ApiProperty()
  metaKeywords!: string;

  @ApiProperty()
  ogSiteName!: string;

  @ApiPropertyOptional({
    description: 'Если задано — используется как og:title на главной; иначе берётся заголовок страницы.',
    nullable: true,
  })
  ogTitle!: string | null;

  @ApiProperty({ description: 'Текст для og:description / twitter:description (глобально).' })
  ogDescription!: string;

  @ApiPropertyOptional({ description: 'Абсолютный URL картинки для превью в соцсетях.', nullable: true })
  ogImageAbsolute!: string | null;

  @ApiPropertyOptional({
    description:
      'Канонический origin (https://example.com). Если не задан в админке — на клиенте используется window.location.origin.',
    nullable: true,
  })
  canonicalOrigin!: string | null;

  @ApiProperty({ example: '#059669' })
  themeColor!: string;

  @ApiProperty({ enum: ['summary', 'summary_large_image'] })
  twitterCard!: 'summary' | 'summary_large_image';
}
