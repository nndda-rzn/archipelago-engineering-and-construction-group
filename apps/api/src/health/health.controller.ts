import { Controller, Get } from '@nestjs/common';
import { healthResponseSchema } from '@aec/api-contracts';
import type { HealthResponse } from '@aec/api-contracts';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    });
  }
}
