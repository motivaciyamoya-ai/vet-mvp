import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AlertsService {
  private readonly log = new Logger(AlertsService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly to: string;

  constructor(private readonly config: ConfigService) {
    this.to = (this.config.get<string>('ALERT_EMAIL_TO') ?? '').trim();
    const host = (this.config.get<string>('SMTP_HOST') ?? '').trim();
    // Транспорт нужен и для писем пользователям (подтверждение email), и для алертов админу.
    // ALERT_EMAIL_TO обязателен только для метода send() — адрес получателя админских писем.
    if (host) {
      const port = parseInt(this.config.get<string>('SMTP_PORT') ?? '587', 10) || 587;
      const user = (this.config.get<string>('SMTP_USER') ?? '').trim();
      const pass = (this.config.get<string>('SMTP_PASS') ?? '').trim();
      const secure =
        this.config.get<string>('SMTP_SECURE')?.trim() === 'true' || port === 465;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
      });
    }
  }

  private fromAddress() {
    return (this.config.get<string>('SMTP_FROM') ?? this.config.get<string>('SMTP_USER') ?? 'alerts@localhost').trim();
  }

  /** Письмо на произвольный адрес (подтверждение email и т. п.). Достаточно задать SMTP_HOST (+ при необходимости SMTP_USER/PASS). */
  async sendTransactional(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    const addr = to?.trim();
    if (!addr) {
      this.log.warn(`Transactional mail skipped: empty recipient, subject=${subject}`);
      return false;
    }
    if (!this.transporter) {
      this.log.debug(`Transactional mail skipped (no SMTP_HOST): to=${addr}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress(),
        to: addr,
        subject,
        text,
        ...(html ? { html } : {}),
      });
      return true;
    } catch (e: unknown) {
      this.log.error(
        `SMTP transactional failed (to=${addr}): ${e instanceof Error ? e.message : e}`,
      );
      return false;
    }
  }

  async send(subject: string, text: string) {
    if (!this.transporter || !this.to) {
      this.log.warn(`Alert (no SMTP): ${subject} — ${text.slice(0, 500)}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress(),
        to: this.to,
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
