import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './config/env';

async function bootstrap() {
  const env = validateEnv(process.env);

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(env.PORT);
  console.log(`AEC API listening on http://localhost:${env.PORT}/api/v1`);
}

void bootstrap();
