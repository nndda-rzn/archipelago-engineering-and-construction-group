import { describe, expect, it } from 'vitest';
import { PAGE_SIZE, PAGE_SIZE_LARGE, listParams } from './pagination';

describe('shared pagination helpers', () => {
  it('PAGE_SIZE default 20', () => {
    expect(PAGE_SIZE).toBe(20);
  });

  it('PAGE_SIZE_LARGE 100', () => {
    expect(PAGE_SIZE_LARGE).toBe(100);
  });

  it('listParams: pageIndex 0 -> page 1 (1-based API)', () => {
    expect(listParams(0, 20)).toEqual({ page: 1, pageSize: 20 });
  });

  it('listParams: pageIndex 2 -> page 3', () => {
    expect(listParams(2, 50)).toEqual({ page: 3, pageSize: 50 });
  });

  it('listParams: hasil deterministic (tidak mutasi input)', () => {
    const a = listParams(1, 20);
    const b = listParams(1, 20);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});