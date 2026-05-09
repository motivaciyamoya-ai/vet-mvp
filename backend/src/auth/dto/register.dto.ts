import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Формат YYYY-MM-DD (как у input[type=date]). */
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: 'Введите email адрес вида имя@домен',
  })
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName: string;

  @ApiProperty({ description: 'ID страны из /reference/countries' })
  @IsString()
  countryId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  city: string;

  @ApiProperty({ description: 'ID должности из /reference/job-titles' })
  @IsString()
  jobTitleId: string;

  @ApiProperty({
    enum: ['SPECIALIST', 'BUSINESS_OWNER', 'ADMINISTRATOR'],
    description:
      'Категория аккаунта (НЕ роль). На доступ к админке не влияет; используется для персонализации.',
  })
  @IsString()
  @IsIn(['SPECIALIST', 'BUSINESS_OWNER', 'ADMINISTRATOR'])
  accountCategory: string;

  @ApiProperty({ example: '1988-07-21', description: 'День рождения, ГГГГ-ММ-ДД' })
  @IsString()
  @Matches(ISO_DATE_ONLY, {
    message: 'Укажите дату рождения в формате ГГГГ-ММ-ДД',
  })
  birthDate: string;

  @ApiProperty({ description: 'Согласие с политикой конфиденциальности и cookies' })
  @Equals(true, { message: 'Для регистрации необходимо согласиться с политикой проекта' })
  policyAccepted: true;
}
