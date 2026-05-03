import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'vet@vetmvp.local' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  /** Стандартный @IsEmail часто режет локальные домены вида @vetmvp.local — для демо и внутренних адресов смягчаем. */
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: 'Введите email адрес вида имя@домен (напр. vet@vetmvp.local)',
  })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Demo123!' })
  @IsString()
  @MinLength(8)
  password: string;
}
