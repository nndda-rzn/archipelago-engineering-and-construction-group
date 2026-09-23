import 'reflect-metadata';
import { Logger } from '@nestjs/common';

const logger = new Logger('Worker');

/**
 * Proses worker AEC (BullMQ).
 *
 * Catatan status (2026-09-23): handler di bawah masih **template** — belum ada produsen
 * yang memanggil `QueueService.enqueue(...)`. Email belum terhubung ke transport apa pun,
 * jadi alih-alih berpura-pura "mengirim", handler mencatat dengan jelas bahwa email
 * belum dikirim. Ganti dengan transport nyata (SMTP/SES) sebelum mengaktifkan di produksi.
 */
async function main() {
  const { QueueService } = await import('./shared/queue/queue.service');
  const queue = new QueueService();

  queue.registerWorker(async (job) => {
    switch (job.name) {
      case 'email.send': {
        const to = (job.data as { to?: string }).to ?? 'unknown';
        logger.warn(`email.send diterima (to=${to}) — transport email belum dikonfigurasi, TIDAK terkirim`);
        break;
      }
      case 'notify.approval': {
        const code = (job.data as { code?: string }).code ?? '?';
        logger.log(`notify.approval untuk ${code}`);
        break;
      }
      default:
        logger.warn(`Job tak dikenal: ${job.name}`);
    }
  });

  logger.log('AEC worker listening (BullMQ)');

  const shutdown = async (signal: string) => {
    logger.log(`Menerima ${signal}, menutup worker…`);
    await queue.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
