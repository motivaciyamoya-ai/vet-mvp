import { ApiProperty } from '@nestjs/swagger';

/** Публичные HTML-тексты политик из `SiteSetting` (`legal.*_html`). */
export class PublicLegalDto {
  @ApiProperty({
    nullable: true,
    description: 'HTML политики конфиденциальности; null — использовать встроенный шаблон на фронте.',
  })
  privacyHtml!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'HTML политики cookies; null — встроенный шаблон.',
  })
  cookiesHtml!: string | null;
}
