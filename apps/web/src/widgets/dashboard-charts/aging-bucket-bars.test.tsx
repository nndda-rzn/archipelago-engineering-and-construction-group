import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AgingBucket } from '@aec/api-contracts';
import { AgingBucketBars } from './aging-bucket-bars';

const bucket = (b: string, amount: number): AgingBucket => ({ bucket: b, amount, detail: [] });

/** Data mirip produksi: satu outlier triliunan menghancurkan skala relatif-max. */
const skewed: AgingBucket[] = [
  bucket('CURRENT', 0),
  bucket('1-30', 13_200_000_000),
  bucket('31-60', 17_500_000_000),
  bucket('61-90', 19_800_000_000),
  bucket('90+', 6_195_638_966_310),
];

describe('AgingBucketBars', () => {
  it('shows large amounts compactly, never an 18-digit full rupiah figure', () => {
    render(<AgingBucketBars buckets={skewed} label="Aging AP" />);
    expect(screen.getByText('Rp 6,2 T')).toBeTruthy();
    // Nominal presisi penuh tetap tersedia lewat title (hover / screen reader).
    expect(screen.getByText('Rp 6,2 T').getAttribute('title')).toMatch(/Rp\s?6\.195\.638\.966\.310/);
    // Tidak ada angka penuh yang panjang di layar.
    expect(screen.queryByText(/6\.195\.638\.966\.310/)).toBeNull();
  });

  it('scales bars by share of total, so a small bucket next to a huge outlier is still visible', () => {
    const { container } = render(<AgingBucketBars buckets={skewed} label="Aging AP" />);
    const fills = [...container.querySelectorAll('[data-slot="aging-bucket-fill"]')] as HTMLElement[];
    const widths = fills.map((f) => parseFloat(f.style.width));
    // Bucket 61-90 (19,8 M) = ~0,3% dari total, tetapi harus tetap punya lebar minimum.
    const nonZero = widths.filter((w) => w > 0);
    expect(nonZero.every((w) => w >= 2)).toBe(true);
    // Baris dengan nilai 0 tidak menggambar bar sama sekali.
    expect(widths[0]).toBe(0);
  });

  it('shows each bucket share as a percentage of the total', () => {
    render(<AgingBucketBars buckets={skewed} label="Aging AP" />);
    // 19,8 M / total ≈ 0,3% → dibulatkan menjadi satu desimal.
    const rows = screen.getAllByText(/%$/);
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps the accessible label with the precise amount', () => {
    render(<AgingBucketBars buckets={skewed} label="Aging AP" />);
    expect(screen.getByLabelText('Aging AP 90+: Rp 6.195.638.966.310')).toBeTruthy();
  });
});
