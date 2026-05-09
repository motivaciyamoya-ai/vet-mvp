import type { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

export const MONITORING_COOKIE_NAME = 'vet_monitoring';

export function monitoringAccessSecret(): string {
  return process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
}

/**
 * Пути GET для nginx auth_request.
 * Основной: /__vet/monitoring-auth (см. VETEXPERT/nginx.conf), вне /api/.
 */
export const MONITORING_AUTH_GET_PATHS = [
  '/__vet/monitoring-auth',
  '/api/monitoring/auth',
  '/monitoring/auth',
] as const;

/** Нормализует pathname (query срезает, // и хвостовой / убирает). */
export function normalizeMonitoringAuthPath(originalUrlOrUrl?: string): string {
  let p = originalUrlOrUrl?.split('?')[0] ?? '';
  try {
    p = decodeURIComponent(p);
  } catch {
    /* оставить как есть */
  }
  p = p.replace(/\/{2,}/g, '/');
  while (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p || '/';
}

/**
 * Ответ для nginx auth_request: 200 { ok: true } или 401 JSON.
 */
export function respondMonitoringAuth(req: Request, res: Response): void {
  const token = (req.cookies?.[MONITORING_COOKIE_NAME] as string | undefined) ?? '';
  if (!token) {
    res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
    return;
  }
  try {
    const payload = jwt.verify(token, monitoringAccessSecret()) as { role?: string; kind?: string };
    if (payload?.role !== 'ADMIN' || payload?.kind !== 'monitoring') {
      res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
      return;
    }
    res.status(200).json({ ok: true });
  } catch {
    res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
  }
}
