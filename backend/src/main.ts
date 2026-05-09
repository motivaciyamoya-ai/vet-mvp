import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { LiveTrafficService } from './live-traffic/live-traffic.service';
import { createLiveTrafficMiddleware } from './live-traffic/live-traffic.express';
import {
  MONITORING_AUTH_GET_PATHS,
  normalizeMonitoringAuthPath,
  respondMonitoringAuth,
} from './monitoring/monitoring-auth.shared';

/** Совпадает со списком в monitoring-auth.shared; строка нужна чтобы `grep __vet dist/main.js` на сервере подтверждал образ. */
const MONITORING_AUTH_PATHS_LOOKUP = new Set<string>(MONITORING_AUTH_GET_PATHS as unknown as string[]);
import { startDefaultMetrics } from './metrics/metrics.init';

function parseCorsOrigin(): boolean | string[] {
  const raw = (process.env.CORS_ORIGINS ?? '').trim();
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      const fe = (process.env.FRONTEND_URL ?? '').trim().replace(/\/+$/, '');
      if (fe) return [fe];
      return true;
    }
    return true;
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function bootstrap() {
  startDefaultMetrics();
  const uploadsRoot = join(process.cwd(), 'uploads');
  mkdirSync(join(uploadsRoot, 'thread'), { recursive: true });
  mkdirSync(join(uploadsRoot, 'avatars'), { recursive: true });
  mkdirSync(join(uploadsRoot, 'listings'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const tp = process.env.TRUST_PROXY?.trim();
  if (tp === '1' || tp === 'true') {
    app.set('trust proxy', 1);
  } else if (tp && /^[1-9]\d*$/.test(tp)) {
    app.set('trust proxy', parseInt(tp, 10));
  }
  app.use(cookieParser());
  /** До любого роутера Nest: иначе /__vet/… даёт 404 и auth_request ломается. */
  app.use((req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }
    const probe = normalizeMonitoringAuthPath(req.originalUrl ?? req.url);
    /** Явное сравнение (дубль списка) — литералы остаются в скомпилированном main.js. */
    const isMonitoringAuth =
      MONITORING_AUTH_PATHS_LOOKUP.has(probe) ||
      probe === '/__vet/monitoring-auth' ||
      probe === '/api/monitoring/auth' ||
      probe === '/monitoring/auth';
    if (!isMonitoringAuth) {
      next();
      return;
    }
    respondMonitoringAuth(req, res);
  });
  app.use(createLiveTrafficMiddleware(app.get(LiveTrafficService)));
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({ origin: parseCorsOrigin(), credentials: true });

  const enableSwagger =
    process.env.ENABLE_SWAGGER === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SWAGGER !== 'false');
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('VetPro CIS API')
      .setDescription('MVP backend для ветеринарного сообщества')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Listening on http://localhost:${port}/api`);
}

bootstrap();
