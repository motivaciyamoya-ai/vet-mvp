import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailConfigService, type MailSmtpResolved } from './mail-config.service';

export type SendMailResult = { ok: true } | { ok: false; message: string };

@Injectable()
export class AlertsService {
  private readonly log = new Logger(AlertsService.name);
  private transportCache: { sig: string; transport: nodemailer.Transporter } | null = null;
  /** Последняя ошибка SMTP для отображения в админке (без логов на сервере). */
  private lastMailError: string | null = null;

  constructor(private readonly mailConfig: MailConfigService) {}

  getLastMailError(): string | null {
    return this.lastMailError;
  }

  clearLastMailError() {
    this.lastMailError = null;
  }

  /** Сбросить кэш транспорта после смены настроек в админке. */
  invalidateTransportCache() {
    this.transportCache = null;
    this.mailConfig.invalidate();
  }

  private smtpSignature(cfg: MailSmtpResolved) {
    return JSON.stringify({
      h: cfg.host,
      p: cfg.port,
      s: cfg.secure,
      u: cfg.user,
      pw: cfg.pass,
    });
  }

  private createTransport(cfg: MailSmtpResolved): nodemailer.Transporter {
    const base: Record<string, unknown> = {
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      pool: false,
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 60_000,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
      },
    };
    if (process.env.SMTP_REQUIRE_TLS === 'true') {
      base.requireTLS = true;
    }
    return nodemailer.createTransport(base as nodemailer.TransportOptions);
  }

  private async ensureTransport(cfg: MailSmtpResolved): Promise<nodemailer.Transporter> {
    const sig = this.smtpSignature(cfg);
    if (this.transportCache?.sig === sig) {
      return this.transportCache.transport;
    }
    const transport = this.createTransport(cfg);
    this.transportCache = { sig, transport };
    return transport;
  }

  private logVerificationFallback(emailNorm: string, verifyUrl: string) {
    this.log.warn(`Подтвердите email (${emailNorm}): ${verifyUrl}`);
  }

  private applyTpl(tpl: string, vars: { verifyUrl: string; email: string }) {
    return tpl.replace(/\{\{verifyUrl\}\}/g, vars.verifyUrl).replace(/\{\{email\}\}/g, vars.email);
  }

  private formatSmtpError(e: unknown): string {
    if (e instanceof Error) {
      const any = e as Error & { response?: string; responseCode?: number };
      const code = any.responseCode != null ? ` [${any.responseCode}]` : '';
      const resp = any.response ? ` ${String(any.response).slice(0, 400)}` : '';
      return `${e.message}${code}${resp}`.trim();
    }
    return String(e);
  }

  /**
   * Письмо подтверждения регистрации. Без SMTP — только запись в лог со ссылкой.
   */
  async sendVerificationMail(toEmail: string, token: string): Promise<boolean> {
    const emailNorm = toEmail.trim().toLowerCase();
    const cfg = await this.mailConfig.resolve();
    const base = (cfg?.frontendUrl ?? 'http://localhost:5173').replace(/\/$/, '');
    const verifyUrl = `${base}/verify-email?token=${encodeURIComponent(token)}`;

    if (!cfg?.host) {
      this.lastMailError = 'SMTP host не задан (ни mail.smtp.host в БД, ни SMTP_HOST в окружении).';
      this.logVerificationFallback(emailNorm, verifyUrl);
      return false;
    }

    const subject = this.applyTpl(cfg.verifySubject, { verifyUrl, email: emailNorm });
    const text = this.applyTpl(cfg.verifyTextTpl, { verifyUrl, email: emailNorm });
    const html = this.applyTpl(cfg.verifyHtmlTpl, { verifyUrl, email: emailNorm });

    const r = await this.sendTransactionalDetailed(emailNorm, subject, text, html, cfg);
    if (!r.ok) {
      this.lastMailError = r.message;
      this.log.error(`Подтверждение email: ${r.message}`);
      this.logVerificationFallback(emailNorm, verifyUrl);
    } else {
      this.lastMailError = null;
      this.log.log(`Письмо с подтверждением отправлено на ${emailNorm}`);
    }
    return r.ok;
  }

  async sendTransactionalDetailed(
    to: string,
    subject: string,
    text: string,
    html?: string,
    cfgOverride?: MailSmtpResolved | null,
  ): Promise<SendMailResult> {
    const addr = to?.trim();
    if (!addr) {
      return { ok: false, message: 'Пустой адрес получателя' };
    }
    const cfg = cfgOverride !== undefined ? cfgOverride : await this.mailConfig.resolve();
    if (!cfg?.host) {
      return { ok: false, message: 'SMTP host не настроен' };
    }
    try {
      const transport = await this.ensureTransport(cfg);
      await transport.sendMail({
        from: cfg.from,
        to: addr,
        subject,
        text,
        ...(html ? { html } : {}),
      });
      return { ok: true };
    } catch (e: unknown) {
      const message = this.formatSmtpError(e);
      this.log.error(`SMTP transactional failed (to=${addr}): ${message}`);
      return { ok: false, message };
    }
  }

  /**
   * Письмо на произвольный адрес. Можно передать уже резолвнутый cfg (рассылка), иначе читается resolve().
   */
  async sendTransactional(
    to: string,
    subject: string,
    text: string,
    html?: string,
    cfgOverride?: MailSmtpResolved | null,
  ): Promise<boolean> {
    const r = await this.sendTransactionalDetailed(to, subject, text, html, cfgOverride);
    this.lastMailError = r.ok ? null : r.message;
    return r.ok;
  }

  /** Проверка соединения с SMTP (без отправки письма). */
  async verifySmtpConnection(cfgOverride?: MailSmtpResolved | null): Promise<SendMailResult> {
    const cfg = cfgOverride !== undefined ? cfgOverride : await this.mailConfig.resolve();
    if (!cfg?.host) {
      return { ok: false, message: 'SMTP host не настроен' };
    }
    try {
      const transport = await this.ensureTransport(cfg);
      await transport.verify();
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, message: this.formatSmtpError(e) };
    }
  }

  async send(subject: string, text: string) {
    const cfg = await this.mailConfig.resolve();
    if (!cfg?.host || !cfg.alertTo) {
      this.log.warn(`Alert (no SMTP или нет mail.alert.to / ALERT_EMAIL_TO): ${subject} — ${text.slice(0, 500)}`);
      return;
    }
    try {
      const transport = await this.ensureTransport(cfg);
      await transport.sendMail({
        from: cfg.from,
        to: cfg.alertTo,
        subject,
        text,
      });
      this.lastMailError = null;
    } catch (e: unknown) {
      const message = this.formatSmtpError(e);
      this.lastMailError = message;
      this.log.error(`SMTP alert failed: ${message}`);
    }
  }

  async notifyAdminLogin(email: string, ip?: string) {
    await this.send(`[VetConnect] Вход ADMIN: ${email}`, `Аккаунт: ${email}\nIP: ${ip ?? 'unknown'}\n`);
  }

  async notifyRoleAdmin(targetEmail: string, actorEmail: string) {
    await this.send(
      `[VetConnect] Роль ADMIN выдана: ${targetEmail}`,
      `Пользователь: ${targetEmail}\nКем изменено (админка): ${actorEmail}\n`,
    );
  }

  async notifyMaintenanceEnabled(actorEmail: string) {
    await this.send(`[VetConnect] Включены техработы`, `Кем: ${actorEmail}\n`);
  }

  async notifyFailedLoginBurst(ip: string, count: number) {
    await this.send(
      `[VetConnect] Всплеск неудачных входов`,
      `IP: ${ip}\nПопыток за короткий интервал: ${count}\n`,
    );
  }
}
