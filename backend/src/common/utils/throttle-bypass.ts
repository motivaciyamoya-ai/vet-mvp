import type { ExecutionContext } from '@nestjs/common';

/** Express-ish request (Nest стоит на Express). */
type LeanReq = {
  originalUrl?: string;
  url?: string;
  path?: string;
  baseUrl?: string;
};

export function throttleBypassUrlsFromRequest(req: LeanReq): string[] {
  const out: string[] = [];
  const a = typeof req.originalUrl === 'string' ? req.originalUrl.split('?')[0] : '';
  const b = typeof req.url === 'string' ? req.url.split('?')[0] : '';
  const c =
    typeof req.baseUrl === 'string' || typeof req.path === 'string'
      ? `${req.baseUrl ?? ''}${req.path ?? ''}`.split('?')[0]
      : '';
  const d = typeof req.path === 'string' ? req.path.split('?')[0] : '';
  for (const x of [a, b, c, d]) {
    if (x) out.push(x);
  }
  return out;
}

/**
 * Пройти мимо именованных throttlers (short/medium/login) для технических точек:
 * nginx auth_request, выдача monitoring-cookie, /metrics для Prometheus.
 */
export function shouldBypassThrottle(req: LeanReq): boolean {
  const urls = throttleBypassUrlsFromRequest(req);
  for (const raw of urls) {
    const p = raw.split('?')[0];
    if (!p.startsWith('/') && !p.includes('/')) continue;
    // Не смешиваем технические проверки с живой статистикой;
    // auth вызывается десятками раз/с из-за iframe Grafana.
    if (p.endsWith('/metrics')) return true;
    if (p.includes('monitoring/auth')) return true;
    if (p.includes('/__vet/monitoring-auth')) return true;
    if (p.includes('/admin/monitoring/session')) return true;
  }
  return false;
}

export function throttlerSkipIfBypass(context: ExecutionContext): boolean {
  const req = context.switchToHttp().getRequest<LeanReq>();
  return shouldBypassThrottle(req);
}
