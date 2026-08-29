import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { healthResponseSchema, readinessResponseSchema } from '@aec/api-contracts';
import type { HealthResponse, ReadinessResponse } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness — app hidup.
  @Get()
  getHealth(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    });
  }

  // Readiness — siap menerima traffic (DB reachable). Utk orchestrator/LB probe.
  @Get('ready')
  async getReady(): Promise<ReadinessResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return readinessResponseSchema.parse({
        status: 'ok',
        db: 'up',
        timestamp: new Date().toISOString(),
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'DB_DOWN',
        message: 'Database tidak tersedia',
        details: { db: 'down' },
      });
    }
  }
}
