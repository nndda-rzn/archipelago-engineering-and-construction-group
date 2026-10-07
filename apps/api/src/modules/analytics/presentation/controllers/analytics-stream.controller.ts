import { Controller, Get, Inject, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { AnalyticsEventsService } from '@/shared/events/analytics-events.service';

const HEARTBEAT_MS = 15_000;

/**
 * SSE change-feed dashboard (FR-DASH-011).
 *
 * `GET /analytics/stream` mengirim event `{topic, at}` setiap ada mutasi yang
 * relevan. Klien memakainya untuk `invalidateQueries` — bukan untuk menerima
 * data. Heartbeat tiap 15 detik menjaga koneksi hidup melewati proxy.
 *
 * Auth: Bearer header biasa (klien memakai `fetch` + `ReadableStream`, bukan
 * `EventSource`, supaya token tetap di header dan tidak bocor ke query string).
 */
@Controller('analytics')
@UseGuards(AuthGuard, PermissionsGuard)
export class AnalyticsStreamController {
  private readonly logger = new Logger(AnalyticsStreamController.name);

  constructor(@Inject(AnalyticsEventsService) private readonly events: AnalyticsEventsService) {}

  // SSE adalah satu koneksi panjang; throttle per-request akan memutusnya.
  @SkipThrottle()
  @Get('stream')
  @Permissions(Permission.AnalyticsView)
  async stream(@Req() req: Request, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // matikan buffering proxy (nginx)
    res.flushHeaders?.();

    // Sinyal siap: klien bisa mulai menghitung sejak koneksi terbentuk.
    res.write(`event: ready\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);

    // Setelah header terkirim, kesalahan TIDAK BOLEH dilempar ke filter global:
    // filter akan mencoba menulis JSON dan memicu ERR_HTTP_HEADERS_SENT (crash).
    // Semua kegagalan di sini ditangani lokal.
    let unsubscribe: (() => Promise<void>) | null = null;
    try {
      unsubscribe = await this.events.subscribe((event) => {
        if (!res.writableEnded) {
          res.write(`event: change\ndata: ${JSON.stringify(event)}\n\n`);
        }
      });
    } catch (err) {
      this.logger.warn(`SSE subscribe failed: ${(err as Error).message}`);
    }

    const heartbeat = setInterval(() => {
      // Komentar sebagai heartbeat: tidak memicu listener, hanya menjaga socket.
      if (!res.writableEnded) res.write(`: ping ${Date.now()}\n\n`);
    }, HEARTBEAT_MS);

    const cleanup = async () => {
      clearInterval(heartbeat);
      if (unsubscribe) await unsubscribe();
      if (!res.writableEnded) res.end();
    };

    req.on('close', () => {
      void cleanup();
    });
  }
}
