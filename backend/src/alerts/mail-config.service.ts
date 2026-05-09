import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/** Ключи SiteSetting для почты (админка + резолв для nodemailer). */
export const MAIL_SITE_KEYS = [
  'mail.smtp.host',
  'mail.smtp.port',
  'mail.smtp.secure',
  'mail.smtp.user',
  'mail.smtp.pass',
  'mail.smtp.from',
  'mail.alert.to',
  'mail.frontend_url',
  'mail.template.verify.subject',
  'mail.template.verify.text',
  'mail.template.verify.html',
] as const;

export type MailSmtpResolved = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  alertTo: string;
  frontendUrl: string;
  verifySubject: string;
  verifyTextTpl: string;
  verifyHtmlTpl: string;
};

@Injectable()
export class MailConfigService {
  private cache: { expires: number; value: MailSmtpResolved | null } | null = null;
  private readonly ttlMs = 4000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  invalidate() {
    this.cache = null;
  }

  /** Есть ли рабочий SMTP host (из БД или env). */
  async smtpHostConfigured(): Promise<boolean> {
    const r = await this.resolve();
    return !!r?.host;
  }

  /**
   * Полная конфигурация для отправки. null — нет host (ни БД, ни env).
   * Пароль: если в БД задан ключ mail.smtp.pass — его значение (в т.ч. пустая строка = без пароля);
   * иначе SMTP_PASS из env.
   */
  async resolve(): Promise<MailSmtpResolved | null> {
    const now = Date.now();
    if (this.cache && this.cache.expires > now) {
      return this.cache.value;
    }

    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: [...MAIL_SITE_KEYS] } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value] as [string, string]));

    const pick = (dbKey: string, envVal: string | undefined) => {
      const raw = map.get(dbKey);
      if (raw !== undefined) {
        return raw.trim();
      }
      return (envVal ?? '').trim();
    };

    const host = pick('mail.smtp.host', this.config.get<string>('SMTP_HOST'));
    if (!host) {
      this.cache = { expires: now + this.ttlMs, value: null };
      return null;
    }

    const portStr = pick('mail.smtp.port', this.config.get<string>('SMTP_PORT')) || '587';
    const port = parseInt(portStr, 10) || 587;
    const secureRaw = pick('mail.smtp.secure', this.config.get<string>('SMTP_SECURE'));
    const secure = secureRaw === 'true' || port === 465;
    const user = pick('mail.smtp.user', this.config.get<string>('SMTP_USER'));
    const passRow = map.get('mail.smtp.pass');
    const pass =
      passRow !== undefined ? String(passRow).trim() : (this.config.get<string>('SMTP_PASS') ?? '').trim();
    const from = pick('mail.smtp.from', this.config.get<string>('SMTP_FROM')) || user || 'noreply@localhost';
    const alertTo = pick('mail.alert.to', this.config.get<string>('ALERT_EMAIL_TO'));
    const frontendUrl =
      pick('mail.frontend_url', this.config.get<string>('FRONTEND_URL')) || 'http://localhost:5173';

    const verifySubject =
      map.get('mail.template.verify.subject')?.trim() || 'VetConnect — подтверждение email';
    const verifyTextTpl =
      map.get('mail.template.verify.text')?.trim() ||
      [
        'Здравствуйте!',
        '',
        'Чтобы подтвердить адрес и получить значок «Почта подтверждена» в профиле, откройте ссылку в течение 72 часов:',
        '',
        '{{verifyUrl}}',
        '',
        'Если вы не регистрировались на VetConnect, просто удалите это письмо.',
      ].join('\n');
    const verifyHtmlTpl =
      map.get('mail.template.verify.html')?.trim() ||
      [
        '<p>Здравствуйте!</p>',
        '<p>Чтобы подтвердить адрес и получить значок «Почта подтверждена» в профиле, нажмите кнопку ниже (ссылка действует 72 часа).</p>',
        '<p><a href="{{verifyUrl}}" style="display:inline-block;padding:10px 16px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Подтвердить email</a></p>',
        '<p style="font-size:13px;color:#444;">Или скопируйте адрес в браузер:<br/><span style="word-break:break-all;">{{verifyUrl}}</span></p>',
        '<p style="font-size:12px;color:#666;">Если вы не регистрировались на VetConnect, удалите это письмо.</p>',
      ].join('');

    const value: MailSmtpResolved = {
      host,
      port,
      secure,
      user,
      pass,
      from,
      alertTo,
      frontendUrl,
      verifySubject,
      verifyTextTpl,
      verifyHtmlTpl,
    };
    this.cache = { expires: now + this.ttlMs, value };
    return value;
  }
}
