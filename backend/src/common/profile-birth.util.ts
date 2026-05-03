import { BadRequestException } from '@nestjs/common';

/** Календарная дата YYYY-MM-DD в локальнойTZ при создании `Date(y, m-1, d)`. */
export function parseBirthDateLocal(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) throw new BadRequestException('Укажите дату рождения в формате ГГГГ-ММ-ДД.');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    throw new BadRequestException('Некорректная дата рождения.');
  }
  return dt;
}

export function assertBirthDateReasonable(bd: Date): void {
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const dm = today.getMonth() - bd.getMonth();
  if (dm < 0 || (dm === 0 && today.getDate() < bd.getDate())) age--;
  if (age < 16) throw new BadRequestException('Регистрация доступна с 16 лет.');
  if (age > 100) throw new BadRequestException('Проверьте корректность даты рождения.');
}
