import { IsOptional, IsUUID } from 'class-validator';

/** UUID для гостя; с Bearer достаточно тела без id — ключ будет `u:{sub}`. */
export class RegisterThreadViewDto {
  @IsOptional()
  @IsUUID('4')
  anonVisitorId?: string;
}
