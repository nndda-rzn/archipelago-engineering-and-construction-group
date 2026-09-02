import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { validateEnv } from './shared/config/env';
import { DecimalToNumberInterceptor } from './shared/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  const env = validateEnv(process.env);
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalInterceptors(new DecimalToNumberInterceptor());

  app.use(helmet());

  app.use(compression());

  app.enableCors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  app.getHttpAdapter().getInstance().set('trust proxy', env.TRUST_PROXY);

  app.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');
  logger.log(`AEC API listening on http://0.0.0.0:${env.PORT}/api/v1`);
}

void bootstrap();
