import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailConfigService, type MailSmtpResolved } from './mail-config.service';

@Injectable()
export class AlertsService {
  private readonly log = new Logger(AlertsService.name);
  private transportCache: { sig: string; transport: nodemailer.Transporter } | null = null;

  constructor(private readonly mailConfig: MailConfigService) {}

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

  private async ensureTransport(cfg: MailSmtpResolved): Promise<nodemailer.Transporter> {
    const sig = this.smtpSignature(cfg);
    if (this.transportCache?.sig === sig) {
      return this.transportCache.transport;
    }
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    this.transportCache = { sig, transport };
    return transport;
  }

  private logVerificationFallback(emailNorm: string, verifyUrl: string) {
    this.log.warn(`Подтвердите email (${emailNorm}): ${verifyUrl}`);
  }

  private applyTpl(tpl: string, vars: { verifyUrl: string; email: string }) {
    return tpl.replace(/\{\{verifyUrl\}\}/g, vars.verifyUrl).replace(/\{\{email\}\}/g, vars.email);
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
      this.logVerificationFallback(emailNorm, verifyUrl);
      return false;
    }

    const subject = this.applyTpl(cfg.verifySubject, { verifyUrl, email: emailNorm });
    const text = this.applyTpl(cfg.verifyTextTpl, { verifyUrl, email: emailNorm });
    const html = this.applyTpl(cfg.verifyHtmlTpl, { verifyUrl, email: emailNorm });

    const ok = await this.sendTransactional(emailNorm, subject, text, html, cfg);
    if (!ok) {
      this.logVerificationFallback(emailNorm, verifyUrl);
    } else {
      this.log.log(`Письмо с подтверждением отправлено на ${emailNorm}`);
    }
    return ok;
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
    const addr = to?.trim();
    if (!addr) {
      this.log.warn(`Transactional mail skipped: empty recipient, subject=${subject}`);
      return false;
    }
    const cfg = cfgOverride !== undefined ? cfgOverride : await this.mailConfig.resolve();
    if (!cfg?.host) {
      this.log.debug(`Transactional mail skipped (no SMTP host): to=${addr}`);
      return false;
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
      return true;
    } catch (e: unknown) {
      this.log.error(`SMTP transactional failed (to=${addr}): ${e instanceof Error ? e.message : e}`);
      return false;
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
    } catch (e: unknown) {
      this.log.error(`SMTP alert failed: ${e instanceof Error ? e.message : e}`);
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
