import { describe, expect, it } from 'vitest';
import { valueTone, TONE_CLASS } from './value-tone';

describe('valueTone', () => {
  it('treats zero as neutral, not positive', () => {
    expect(valueTone(0)).toBe('neutral');
  });
  it('treats a positive amount as positive', () => {
    expect(valueTone(1)).toBe('positive');
  });
  it('treats a negative amount as negative', () => {
    expect(valueTone(-1)).toBe('negative');
  });
  it('treats null as neutral', () => {
    expect(valueTone(null)).toBe('neutral');
  });
});

describe('TONE_CLASS', () => {
  it('maps zero to the neutral text token', () => {
    expect(TONE_CLASS[valueTone(0)]).toBe('text-neutral-950');
  });
  it('maps positive to financial-positive-600', () => {
    expect(TONE_CLASS[valueTone(100)]).toBe('text-financial-positive-600');
  });
  it('maps negative to financial-negative-600', () => {
    expect(TONE_CLASS[valueTone(-100)]).toBe('text-financial-negative-600');
  });
});
