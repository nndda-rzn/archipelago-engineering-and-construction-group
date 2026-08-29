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
  // Prisma Decimal -> string JSON -> number (agar klien tak perlu revive manual).
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());

  // Security headers.
  app.use(helmet());
  // Gzip/Brotli response compression.
  app.use(compression());

  // CORS — dikontrol env (utk web di domain berbeda/domisili yang sama via proxy).
  app.enableCors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  // Trust proxy — wajib saat di belakang reverse-proxy/LB (IP asli utk rate limit & log).
  app.getHttpAdapter().getInstance().set('trust proxy', env.TRUST_PROXY);

  // Graceful shutdown utk deploy (SIGTERM/SIGINT).
  app.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');
  logger.log(`AEC API listening on http://0.0.0.0:${env.PORT}/api/v1`);
}

void bootstrap();
