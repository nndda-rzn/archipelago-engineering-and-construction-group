import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/** Satu sinyal perubahan yang dikirim ke klien lewat SSE. */
export interface AnalyticsChangeEvent {
  /** Topik perubahan, mis. "approval" | "invoice" | "stock" | "analytics". */
  topic: string;
  /** Waktu kejadian (ISO). */
  at: string;
}

const CHANNEL = 'aec:analytics:changed';

/**
 * Event bus perubahan analytics (FR-DASH-011).
 *
 * Menyalurkan **sinyal perubahan** — bukan data — lewat Redis pub/sub. Klien
 * (SSE) menerimanya lalu meminta ulang endpoint yang sudah ada lewat TanStack
 * Query, sehingga tidak ada logika agregasi baru dan tidak ada data basi.
 *
 * Redis pub/sub (bukan in-process) supaya fan-out tetap benar bila API berjalan
 * di beberapa instance. Bila Redis tidak tersedia, publish gagal secara senyap
 * (dashboard tetap jalan lewat polling) — degradasi anggun.
 */
@Injectable()
export class AnalyticsEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsEventsService.name);
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.publisher = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableReadyCheck: false });
    this.subscriber = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableReadyCheck: false });
    this.publisher.on('error', (err) => this.logger.warn(`Analytics publisher Redis error: ${err.message}`));
    this.subscriber.on('error', (err) => this.logger.warn(`Analytics subscriber Redis error: ${err.message}`));
  }

  /** Umumkan perubahan pada sebuah topik. Tidak melempar bila Redis mati. */
  async publish(topic: string): Promise<void> {
    const event: AnalyticsChangeEvent = { topic, at: new Date().toISOString() };
    try {
      await this.publisher.publish(CHANNEL, JSON.stringify(event));
    } catch (err) {
      this.logger.warn(`Analytics publish fail (${topic}): ${(err as Error).message}`);
    }
  }

  /**
   * Langganan perubahan. Mengembalikan fungsi `unsubscribe` yang **wajib**
   * dipanggil saat klien SSE putus, agar tidak ada listener bocor.
   */
  async subscribe(onEvent: (event: AnalyticsChangeEvent) => void): Promise<() => Promise<void>> {
    const handler = (channel: string, message: string) => {
      if (channel !== CHANNEL) return;
      try {
        onEvent(JSON.parse(message) as AnalyticsChangeEvent);
      } catch {
        // Pesan tidak valid diabaikan — jangan mematikan stream karena satu pesan rusak.
      }
    };
    try {
      await this.subscriber.subscribe(CHANNEL);
      this.subscriber.on('message', handler);
    } catch (err) {
      this.logger.warn(`Analytics subscribe fail: ${(err as Error).message}`);
    }
    return async () => {
      try {
        this.subscriber.off('message', handler);
        await this.subscriber.unsubscribe(CHANNEL);
      } catch {
        // Senyap: pembersihan saat shutdown.
      }
    };
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}
