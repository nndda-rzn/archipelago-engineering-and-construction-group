import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { describeDatabaseTarget, describeEnvOverrides, validateEnv } from './shared/config/env';
import { loadEnvFile, shouldOverrideFromDotenv } from './shared/config/load-env';
import { DecimalToNumberInterceptor } from './shared/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  // Muat .env SEBELUM validasi. Di development `.env` proyek menang atas env var
  // global (mis. DATABASE_URL milik proyek lain) — lihat load-env.ts.
  loadEnvFile();

  const env = validateEnv(process.env);
  const logger = new Logger('Bootstrap');

  // `dotenv` bawaan TIDAK menimpa variabel yang sudah ada. Di development kita
  // sengaja membalik itu (lihat load-env.ts) supaya `.env` proyek menang. Di
  // test/production env platform tetap menang — dan itu memang disengaja.
  const overrides = describeEnvOverrides(process.env);
  if (overrides.length > 0) {
    if (shouldOverrideFromDotenv(process.env.NODE_ENV)) {
      logger.log(
        `Environment variables also present globally (overridden by .env in development): ${overrides.join(', ')}`,
      );
    } else {
      logger.warn(
        `Environment variables taking precedence over .env (${process.env.NODE_ENV}): ${overrides.join(', ')}. ` +
          'If these belong to another project, unset them or the API may target the wrong service.',
      );
    }
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
