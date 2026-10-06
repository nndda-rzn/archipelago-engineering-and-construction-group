import { Controller, Get, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { healthResponseSchema, readinessResponseSchema } from '@aec/api-contracts';
import type { HealthResponse, ReadinessResponse } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  // `@Inject` eksplisit (bukan mengandalkan metadata tipe): `tsx` menjalankan TS
  // tanpa `emitDecoratorMetadata`, sehingga injeksi berbasis-tipe bisa menjadi
  // `undefined` dan `/health/ready` selalu 503. Semua controller lain di repo ini
  // memakai `@Inject(...)`; ini menyamakannya.
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Liveness: proses hidup dan bisa melayani HTTP. **Tidak** menyentuh database —
   * itu tugas `/health/ready`. Pemisahan ini disengaja: sebuah proses yang hidup
   * tapi buta DB tetap "live" (tidak perlu di-restart), hanya belum "ready".
   */
  @Get()
  getHealth(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    });
  }

  /** Readiness: benar-benar bisa menjangkau database. */
  @Get('ready')
  async getReady(): Promise<ReadinessResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return readinessResponseSchema.parse({
        status: 'ok',
        db: 'up',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Jangan telan error: tanpa log, penyebab 503 tidak bisa didiagnosis.
      // Pesan ke klien tetap generik (tidak boleh memuat host/kredensial).
      this.logger.error(
        `Readiness check failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException({
        code: 'DB_DOWN',
        message: 'Database is unavailable',
        details: { db: 'down' },
      });
    }
  }
}
