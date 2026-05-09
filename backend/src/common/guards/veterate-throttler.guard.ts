import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { shouldBypassThrottle } from '../utils/throttle-bypass';

/**
 * Nginx делает множественные быстрые auth_request к /api/monitoring/auth под одним клиентским IP.
 * Общие named-throttlers (short/medium) легко попадают в 429 и ломают Grafana (nginx → 500).
 * Здесь гарантированно пропускаем несколько технических endpoints до родительских лимитов.
 */
@Injectable()
export class VeterateThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ originalUrl?: string; url?: string; path?: string; baseUrl?: string }>();
    if (shouldBypassThrottle(req)) return true;

    return super.canActivate(context);
  }
}
