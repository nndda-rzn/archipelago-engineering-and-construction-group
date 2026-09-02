import 'reflect-metadata';

async function main() {
  const { QueueService } = await import('./shared/queue/queue.service');
  const queue = new QueueService();

  queue.registerWorker(async (job) => {
    switch (job.name) {
      case 'email.send':

        console.log(`[worker] Kirim email ke ${(job.data as { to?: string }).to ?? 'unknown'}`);
        break;
      case 'notify.approval':
        console.log(`[worker] Notifikasi approval utk ${(job.data as { code?: string }).code ?? '?'}`);
        break;
      default:
        console.log(`[worker] Job tak dikenal: ${job.name}`);
    }
  });

  console.log('[worker] AEC worker listening (BullMQ)');
  setInterval(() => {}, 1 << 30);
}

void main();
