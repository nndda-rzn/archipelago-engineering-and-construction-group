import { Controller, Get, Inject, Req, Res, UseGuards } from '@nestjs/common';
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

    const unsubscribe = await this.events.subscribe((event) => {
      res.write(`event: change\ndata: ${JSON.stringify(event)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      // Komentar sebagai heartbeat: tidak memicu listener, hanya menjaga socket.
      res.write(`: ping ${Date.now()}\n\n`);
    }, HEARTBEAT_MS);

    const cleanup = async () => {
      clearInterval(heartbeat);
      await unsubscribe();
      if (!res.writableEnded) res.end();
    };

    req.on('close', () => {
      void cleanup();
    });
  }
}
