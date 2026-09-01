import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export const QUEUE_NAME = 'aec-background';

/**
 * QueueService — BullMQ queue utk background jobs (email/notifikasi/export).
 * redis connection dari REDIS_URL. lazyConnect: worker & queue dikelola manual
 * agar tidak blokir saat Redis down (opsi: upscay production db terpisah).
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private connection: IORedis;
  private queue?: Queue;

  constructor() {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.connection = new IORedis(url, {
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    this.queue = new Queue(QUEUE_NAME, { connection: this.connection });
  }

  async enqueue(name: string, data: object, opts?: { attempts?: number; delay?: number }): Promise<void> {
    try {
      await this.queue!.add(name, data, {
        attempts: opts?.attempts ?? 3,
        backoff: { type: 'exponential', delay: 1000 },
        ...(opts?.delay ? { delay: opts.delay } : {}),
      });
    } catch (err) {
      this.logger.error(`Enqueue fail ${name}: ${(err as Error).message}`);
    }
  }

  /** Register handler. Panggil dari worker entrypoint (bukan request cycle). */
  registerWorker(handler: (job: { name: string; data: unknown }) => Promise<void>): Worker {
    const worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        await handler({ name: job.name, data: job.data });
      },
      { connection: this.connection },
    );
    worker.on('failed', (job, err) => this.logger.error(`Job ${job?.name} failed: ${err.message}`));
    return worker;
  }
}
