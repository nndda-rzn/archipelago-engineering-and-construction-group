import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { openAnalyticsStream } from '@/shared/lib/stream';

export interface LiveAnalyticsState {
  /** Apakah stream sedang aktif (bisa dimatikan user). */
  enabled: boolean;
  /** Apakah koneksi stream sedang terbuka. */
  connected: boolean;
  /** Waktu perubahan terakhir (ms epoch), untuk "updated Ns ago". */
  lastChangeAt: number | null;
  setEnabled: (value: boolean) => void;
}

/**
 * Langganan change-feed dashboard (FR-DASH-011).
 *
 * Saat server memancarkan sinyal perubahan, semua query analytics dimuat ulang
 * lewat `invalidateQueries(['analytics'...])` — memakai cache dan hook yang
 * sudah ada, tanpa logika agregasi baru.
 *
 * Koneksi diputus saat tab disembunyikan (hemat resource) dan saat unmount.
 * `enabled=false` mematikan live sepenuhnya (tombol Live/Paused).
 */
export function useLiveAnalytics(enabled: boolean): LiveAnalyticsState {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastChangeAt, setLastChangeAt] = useState<number | null>(null);
  const [on, setOn] = useState(enabled);

  // Ref agar callback stream selalu melihat nilai terbaru tanpa me-resubscribe.
  const onRef = useRef(on);
  useEffect(() => {
    onRef.current = on;
  }, [on]);

  useEffect(() => {
    if (!on) {
      // Jadwalkan agar tidak ada setState sinkron di dalam effect.
      const t = window.setTimeout(() => setConnected(false), 0);
      return () => clearTimeout(t);
    }

    let close: (() => void) | null = null;

    const connect = () => {
      close?.();
      close = openAnalyticsStream({
        onReady: () => setConnected(true),
        onError: () => setConnected(false),
        onChange: () => {
          setLastChangeAt(Date.now());
          // Segarkan seluruh permukaan analytics (control-tower, executive, aging,
          // cash-flow, signals, anomalies, portfolio) dalam satu panggilan.
          void queryClient.invalidateQueries({ queryKey: ['analytics'] });
          void queryClient.invalidateQueries({ queryKey: ['analytics-control-tower'] });
          void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        },
      });
    };

    const onVisibility = () => {
      if (document.hidden) {
        close?.();
        close = null;
        setConnected(false);
      } else if (onRef.current) {
        connect();
      }
    };

    connect();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      close?.();
      setConnected(false);
    };
  }, [on, queryClient]);

  return { enabled: on, connected, lastChangeAt, setEnabled: setOn };
}
