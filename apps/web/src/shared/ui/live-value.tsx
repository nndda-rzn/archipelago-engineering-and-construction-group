import { useEffect, useRef, useState } from 'react';
import { cn } from '@aec/ui';

export interface LiveValueProps {
  /** Nilai numerik saat ini. Perubahan memicu count-up + flash. */
  value: number;
  /** Pemformat angka (mis. formatIdr). */
  format: (n: number) => string;
  /** Kelas tambahan untuk teks nilai. */
  className?: string;
  /** Slot data untuk test. */
  'data-slot'?: string;
}

/**
 * Angka yang "hidup": saat `value` berubah, ia berhitung naik/turun (520ms) dan
 * berkedip latar (hijau bila naik, merah bila turun) lalu pudar.
 *
 * Semua pembaruan state dijadwalkan lewat `requestAnimationFrame` (bukan sinkron
 * di dalam effect), dan animasi hanya menyentuh warna latar (compositor-friendly).
 * Saat `prefers-reduced-motion: reduce`, nilai langsung ditetapkan tanpa animasi.
 */
export function LiveValue({ value, format, className, ...rest }: LiveValueProps) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    if (from === value) return;

    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const up = value >= from;
    let raf = 0;
    let clear = 0;

    // Jadwalkan di frame berikutnya agar tidak ada setState sinkron dalam effect.
    raf = requestAnimationFrame(() => {
      prevRef.current = value;
      if (reduce) {
        setDisplay(value);
        return;
      }
      setFlash(up ? 'up' : 'down');
      const start = performance.now();
      const duration = 520;
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - k, 3);
        setDisplay(from + (value - from) * eased);
        if (k < 1) raf = requestAnimationFrame(step);
        else setDisplay(value);
      };
      raf = requestAnimationFrame(step);
      clear = window.setTimeout(() => setFlash(null), 900);
    });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(clear);
    };
  }, [value]);

  return (
    <span
      {...rest}
      className={cn(
        'inline-block rounded-sm px-0.5 transition-colors duration-slow',
        flash === 'up' && 'bg-success-50',
        flash === 'down' && 'bg-destructive-50',
        className,
      )}
    >
      {format(display)}
    </span>
  );
}
