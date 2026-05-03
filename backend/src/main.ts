import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { LiveTrafficService } from './live-traffic/live-traffic.service';
import { createLiveTrafficMiddleware } from './live-traffic/live-traffic.express';

async function bootstrap() {
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
  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('VetPro CIS API')
    .setDescription('MVP backend для ветеринарного сообщества')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Listening on http://localhost:${port}/api/docs`);
}

bootstrap();
