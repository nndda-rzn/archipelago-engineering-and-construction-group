const API_BASE = '/api/v1';

export interface StreamChangeEvent {
  topic: string;
  at: string;
}

export interface AnalyticsStreamOptions {
  /** Dipanggil setiap event `change` dari server. */
  onChange: (event: StreamChangeEvent) => void;
  /** Dipanggil saat koneksi pertama siap. */
  onReady?: () => void;
  /** Dipanggil saat stream terputus (untuk indikator UI). */
  onError?: () => void;
}

/**
 * Klien SSE change-feed (FR-DASH-011).
 *
 * Memakai `fetch` + `ReadableStream`, **bukan** `EventSource`, karena
 * `EventSource` tidak bisa mengirim header `Authorization` — dan menaruh token
 * di query string membocorkannya ke log server. Dengan `fetch` kita memakai
 * Bearer yang sama seperti seluruh app.
 *
 * Mengembalikan fungsi `close()` yang membatalkan koneksi (dipakai saat unmount
 * dan saat tab disembunyikan).
 */
export function openAnalyticsStream(opts: AnalyticsStreamOptions): () => void {
  const controller = new AbortController();
  const token = localStorage.getItem('aec_token');

  void (async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/stream`, {
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        opts.onError?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Pisahkan per blok event (dipisah baris kosong).
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
          if (block.startsWith(':')) continue; // heartbeat/komentar
          const eventLine = block.split('\n').find((l) => l.startsWith('event:'));
          const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
          const eventName = eventLine?.slice(6).trim();
          if (eventName === 'ready') {
            opts.onReady?.();
          } else if (eventName === 'change' && dataLine) {
            try {
              opts.onChange(JSON.parse(dataLine.slice(5).trim()) as StreamChangeEvent);
            } catch {
              // Abaikan payload rusak; jangan matikan stream.
            }
          }
        }
      }
    } catch {
      // AbortError saat close() adalah normal; error lain → tandai terputus.
      if (!controller.signal.aborted) opts.onError?.();
    }
  })();

  return () => controller.abort();
}
