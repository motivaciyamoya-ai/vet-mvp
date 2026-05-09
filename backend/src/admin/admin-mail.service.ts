import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { MAIL_SITE_KEYS, MailConfigService } from '../alerts/mail-config.service';
import type { AdminMailBroadcastDto, AdminMailPutDto } from './dto/admin-mail.dto';

@Injectable()
export class AdminMailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailConfig: MailConfigService,
    private readonly alerts: AlertsService,
  ) {}

  async getSettings() {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: [...MAIL_SITE_KEYS] } },
      orderBy: { key: 'asc' },
    });
    const map = new Map(rows.map((r) => [r.key, r.value] as [string, string]));
    const resolved = await this.mailConfig.resolve();
    const passRow = map.get('mail.smtp.pass');
    const smtpPasswordStoredInDatabase =
      passRow !== undefined && String(passRow).length > 0;

    const subjRaw = map.get('mail.template.verify.subject')?.trim();
    const textRaw = map.get('mail.template.verify.text');
    const htmlRaw = map.get('mail.template.verify.html');

    return {
      smtpHost: map.get('mail.smtp.host') ?? '',
      smtpPort: map.get('mail.smtp.port') ?? '',
      smtpSecure: map.get('mail.smtp.secure') ?? '',
      smtpUser: map.get('mail.smtp.user') ?? '',
      smtpFrom: map.get('mail.smtp.from') ?? '',
      alertTo: map.get('mail.alert.to') ?? '',
      frontendUrl: map.get('mail.frontend_url') ?? '',
      verifySubject: subjRaw || resolved?.verifySubject || '',
      verifyTextTemplate: (textRaw !== undefined && textRaw !== '') ? textRaw : resolved?.verifyTextTpl || '',
      verifyHtmlTemplate: (htmlRaw !== undefined && htmlRaw !== '') ? htmlRaw : resolved?.verifyHtmlTpl || '',
      smtpPasswordStoredInDatabase,
      effectiveSmtpConfigured: !!resolved?.host,
      placeholdersHint:
        'В шаблонах подтверждения: {{verifyUrl}}, {{email}}. В рассылке: {{email}}, {{frontendUrl}}.',
      lastSmtpError: this.alerts.getLastMailError(),
      diagnostics: {
        hostFromDatabase: !!(map.get('mail.smtp.host')?.trim()),
        smtpHostEffective: resolved?.host ? `${resolved.host}:${resolved.port}` : '',
        secure: resolved?.secure ?? false,
        smtpUserSet: !!(resolved?.user?.trim()),
        smtpPassSet: !!resolved?.pass,
        fromSet: !!(resolved?.from?.trim()),
      },
    };
  }

  private async upsertOrDelete(key: string, value: string | undefined) {
    if (value === undefined) return;
    const v = value.trim();
    if (v === '') {
      await this.prisma.siteSetting.deleteMany({ where: { key } });
    } else {
      await this.prisma.siteSetting.upsert({
        where: { key },
        update: { value: v },
        create: { key, value: v },
      });
    }
  }

  async putSettings(dto: AdminMailPutDto) {
    if (dto.smtpHost !== undefined) await this.upsertOrDelete('mail.smtp.host', dto.smtpHost);
    if (dto.smtpPort !== undefined) await this.upsertOrDelete('mail.smtp.port', dto.smtpPort);
    if (dto.smtpSecure !== undefined) await this.upsertOrDelete('mail.smtp.secure', dto.smtpSecure);
    if (dto.smtpUser !== undefined) await this.upsertOrDelete('mail.smtp.user', dto.smtpUser);
    if (dto.smtpFrom !== undefined) await this.upsertOrDelete('mail.smtp.from', dto.smtpFrom);
    if (dto.alertTo !== undefined) await this.upsertOrDelete('mail.alert.to', dto.alertTo);
    if (dto.frontendUrl !== undefined) await this.upsertOrDelete('mail.frontend_url', dto.frontendUrl);
    if (dto.verifySubject !== undefined) {
      await this.upsertOrDelete('mail.template.verify.subject', dto.verifySubject);
    }
    if (dto.verifyTextTemplate !== undefined) {
      await this.upsertOrDelete('mail.template.verify.text', dto.verifyTextTemplate);
    }
    if (dto.verifyHtmlTemplate !== undefined) {
      await this.upsertOrDelete('mail.template.verify.html', dto.verifyHtmlTemplate);
    }
    if (dto.smtpPass !== undefined) {
      if (dto.smtpPass === '') {
        await this.prisma.siteSetting.deleteMany({ where: { key: 'mail.smtp.pass' } });
      } else {
        await this.prisma.siteSetting.upsert({
          where: { key: 'mail.smtp.pass' },
          update: { value: dto.smtpPass },
          create: { key: 'mail.smtp.pass', value: dto.smtpPass },
        });
      }
    }

    this.mailConfig.invalidate();
    this.alerts.invalidateTransportCache();
    return this.getSettings();
  }

  async sendTestTo(adminEmail: string) {
    const cfg = await this.mailConfig.resolve();
    if (!cfg?.host) {
      throw new BadRequestException(
        'SMTP не настроен: задайте mail.smtp.host в админке или SMTP_HOST в окружении (корневой .env для docker compose).',
      );
    }
    const verify = await this.alerts.verifySmtpConnection(cfg);
    if (!verify.ok) {
      throw new BadRequestException(
        `Соединение с SMTP не установлено: ${verify.message}. Проверьте host/port, SSL (465 secure=true), логин/пароль, файрвол.`,
      );
    }
    const subject = '[VetConnect] Тест почты';
    const text = `Письмо отправлено с ${cfg.host}:${cfg.port} в ${new Date().toISOString()}\nПолучатель: ${adminEmail}\n`;
    const sent = await this.alerts.sendTransactionalDetailed(
      adminEmail,
      subject,
      text,
      `<pre>${text}</pre>`,
      cfg,
    );
    if (!sent.ok) {
      throw new BadRequestException(`Отправка отклонена сервером: ${sent.message}`);
    }
    return { ok: true };
  }

  async broadcast(dto: AdminMailBroadcastDto, actorUserId: string) {
    const cfg = await this.mailConfig.resolve();
    if (!cfg?.host) {
      throw new BadRequestException('SMTP не настроен.');
    }

    const where =
      dto.audience === 'verified'
        ? { emailVerified: true as const }
        : dto.audience === 'unverified'
          ? { emailVerified: false as const }
          : {};

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true },
      orderBy: { createdAt: 'asc' },
    });

    if (dto.dryRun) {
      return { dryRun: true, recipientCount: users.length, audience: dto.audience };
    }

    const baseUrl = cfg.frontendUrl.replace(/\/$/, '');
    let sent = 0;
    let failed = 0;
    const errors: { email: string; message: string }[] = [];

    for (let i = 0; i < users.length; i++) {
      const u = users[i]!;
      const text = dto.bodyText
        .replace(/\{\{email\}\}/g, u.email)
        .replace(/\{\{frontendUrl\}\}/g, baseUrl);
      const html = dto.bodyHtml
        ? dto.bodyHtml.replace(/\{\{email\}\}/g, u.email).replace(/\{\{frontendUrl\}\}/g, baseUrl)
        : undefined;
      const ok = await this.alerts.sendTransactional(u.email, dto.subject, text, html, cfg);
      if (ok) sent += 1;
      else {
        failed += 1;
        if (errors.length < 30) {
          errors.push({ email: u.email, message: 'send failed' });
        }
      }
      if (i > 0 && i % 12 === 0) {
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    return {
      ok: true,
      actorUserId,
      audience: dto.audience,
      total: users.length,
      sent,
      failed,
      errors,
    };
  }
}
