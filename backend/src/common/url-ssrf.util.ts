import { BadRequestException } from '@nestjs/common';

/** Запретить SSRF: только http(s), не localhost и не частные диапазоны. */
export function assertPublicHttpUrl(rawUrl: string, label = 'URL'): void {
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    throw new BadRequestException(`Некорректный ${label}.`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new BadRequestException(`Разрешены только http/https для ${label}.`);
  }
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.local')) {
    throw new BadRequestException(`Запрещённый хост для ${label}.`);
  }
  if (host === '::1' || host === '[::1]') {
    throw new BadRequestException(`Запрещённый хост для ${label}.`);
  }
  // IPv4
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (m) {
    const oct = [m[1], m[2], m[3], m[4]].map((x) => parseInt(x, 10));
    if (oct.some((n) => n > 255)) throw new BadRequestException(`Некорректный IP в ${label}.`);
    const [a, b] = [oct[0], oct[1]];
    if (a === 10) throw new BadRequestException(`Запрещённый частный адрес в ${label}.`);
    if (a === 127) throw new BadRequestException(`Запрещённый loopback в ${label}.`);
    if (a === 0) throw new BadRequestException(`Запрещённый адрес в ${label}.`);
    if (a === 169 && b === 254) throw new BadRequestException(`Запрещён link-local в ${label}.`);
    if (a === 192 && b === 168) throw new BadRequestException(`Запрещённый частный адрес в ${label}.`);
    if (a === 172 && b >= 16 && b <= 31) throw new BadRequestException(`Запрещённый частный адрес в ${label}.`);
    if (a === 100 && b >= 64 && b <= 127) throw new BadRequestException(`Запрещённый CGNAT в ${label}.`);
  }
  // IPv6 префиксы (упрощённо)
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) {
    throw new BadRequestException(`Запрещённый IPv6-адрес в ${label}.`);
  }
}
