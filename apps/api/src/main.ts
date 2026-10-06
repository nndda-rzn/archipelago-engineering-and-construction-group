import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { describeDatabaseTarget, describeEnvOverrides, validateEnv } from './shared/config/env';
import { DecimalToNumberInterceptor } from './shared/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  const env = validateEnv(process.env);
  const logger = new Logger('Bootstrap');

  // `dotenv` TIDAK menimpa variabel yang sudah ada di environment. Kalau kunci
  // ini sudah di-set global (mis. oleh proyek lain), isi `.env` diabaikan dan
  // API bisa diam-diam menunjuk database yang salah. Sebutkan secara eksplisit.
  const overrides = describeEnvOverrides(process.env);
  if (overrides.length > 0) {
    logger.warn(
      `Environment variables already set and taking precedence over .env: ${overrides.join(', ')}. ` +
        'If these belong to another project, unset them or the API may target the wrong service.',
    );
  }
  const dbTarget = describeDatabaseTarget(env.DATABASE_URL);
  if (dbTarget) {
    logger.log(`Database target: ${dbTarget.host}:${dbTarget.port}/${dbTarget.database}`);
  } else {
    logger.warn('DATABASE_URL could not be parsed — connection target unknown.');
  }

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
