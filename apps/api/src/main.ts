import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './shared/config/env';
import { DecimalToNumberInterceptor } from './shared/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  const env = validateEnv(process.env);

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  // Prisma Decimal -> string JSON -> number (agar klien tak perlu revive manual).
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());
  await app.listen(env.PORT);
  console.log(`AEC API listening on http://localhost:${env.PORT}/api/v1`);
}

void bootstrap();
