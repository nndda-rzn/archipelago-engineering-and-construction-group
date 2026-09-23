import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export const QUEUE_NAME = 'aec-background';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: IORedis;
  private readonly queue: Queue;
  private worker?: Worker;

  constructor() {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    // `lazyConnect: true` -> tidak membuka koneksi sampai perintah pertama. Tanpa ini,
    // setiap instantiasi (mis. per instance API) langsung membuka koneksi Redis yang
    // bisa saja tak pernah dipakai. `maxRetriesPerRequest: null` wajib untuk Worker BullMQ.
    this.connection = new IORedis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      enableReadyCheck: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    this.connection.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
    this.queue = new Queue(QUEUE_NAME, { connection: this.connection });
  }

  async enqueue(name: string, data: object, opts?: { attempts?: number; delay?: number }): Promise<void> {
    try {
      await this.queue.add(name, data, {
        attempts: opts?.attempts ?? 3,
        backoff: { type: 'exponential', delay: 1000 },
        ...(opts?.delay ? { delay: opts.delay } : {}),
      });
    } catch (err) {
      this.logger.error(`Enqueue fail ${name}: ${(err as Error).message}`);
    }
  }

  registerWorker(handler: (job: { name: string; data: unknown }) => Promise<void>): Worker {
    const worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        await handler({ name: job.name, data: job.data });
      },
      { connection: this.connection },
    );
    worker.on('failed', (job, err) => this.logger.error(`Job ${job?.name} failed: ${err.message}`));
    this.worker = worker;
    return worker;
  }

  /** Tutup worker, queue, dan koneksi Redis dengan rapi (dipakai saat shutdown proses worker). */
  async close(): Promise<void> {
    try {
      await this.worker?.close();
    } catch (err) {
      this.logger.warn(`Worker close fail: ${(err as Error).message}`);
    }
    try {
      await this.queue.close();
    } catch (err) {
      this.logger.warn(`Queue close fail: ${(err as Error).message}`);
    }
    this.connection.disconnect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
