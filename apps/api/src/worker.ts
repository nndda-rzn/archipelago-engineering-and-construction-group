import 'reflect-metadata';

/**
 * Worker entrypoint — dijalankan sebagai service terpisah (compose.prod `worker`).
 * Mendaftarkan handler background jobs (contoh: email notifikasi).
 * Jalan sendiri, bukan bagian dari request-response cycle API utama.
 *
 * Jalankan: `npx tsx src/worker.ts` (atau via compose worker service)
 */
async function main() {
  const { QueueService } = await import('./shared/queue/queue.service');
  const queue = new QueueService();

  queue.registerWorker(async (job) => {
    switch (job.name) {
      case 'email.send':
        // Contoh: kirim email. Ganti dengan provider email sungguhan (nodemailer/SES).
        console.log(`[worker] Kirim email ke ${(job.data as { to?: string }).to ?? 'unknown'}`);
        break;
      case 'notify.approval':
        console.log(`[worker] Notifikasi approval utk ${(job.data as { code?: string }).code ?? '?'}`);
        break;
      default:
        console.log(`[worker] Job tak dikenal: ${job.name}`);
    }
  });

  // Keep process alive.
  console.log('[worker] AEC worker listening (BullMQ)');
  setInterval(() => {}, 1 << 30);
}

void main();
