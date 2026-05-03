import type { NextFunction, Request, Response } from 'express';
import { LiveTrafficService } from './live-traffic.service';

function clientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) {
    return xff.split(',')[0].trim().slice(0, 128);
  }
  const xri = req.headers['x-real-ip'];
  if (typeof xri === 'string' && xri.length) {
    return xri.trim().slice(0, 128);
  }
  const raw = req.socket?.remoteAddress ?? '';
  return raw.replace(/^::ffff:/, '').slice(0, 128) || 'unknown';
}

function shouldSkip(path: string): boolean {
  const p = path.split('?')[0] ?? '';
  if (!p.startsWith('/api')) return true;
  if (p.startsWith('/api/admin')) return true;
  if (p.startsWith('/api/docs')) return true;
  if (p.startsWith('/api/health')) return true;
  if (p === '/api') return true;
  return false;
}

/** Подключать в bootstrap сразу после NestFactory.create (полный доступ к очереди DI). */
export function createLiveTrafficMiddleware(liveTraffic: LiveTrafficService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const raw = req.originalUrl || req.url || '';
    const pathPart = raw.split('?')[0] ?? '';

    try {
      if (!shouldSkip(pathPart)) {
        liveTraffic.recordRequest({
          ip: clientIp(req),
          method: req.method,
          path: pathPart.slice(0, 2000),
          userAgent:
            typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
        });
      }
    } catch {
      /* не блокируем */
    }

    next();
  };
}
