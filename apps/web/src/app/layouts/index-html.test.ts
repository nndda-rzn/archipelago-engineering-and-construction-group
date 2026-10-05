import { describe, expect, it } from 'vitest';
// Vite meng-inline isi file sebagai string pada build test (`?raw`).
import html from '../../../index.html?raw';

describe('index.html', () => {
  it('links the favicon', () => {
    expect(html).toMatch(/<link[^>]+rel="icon"[^>]+href="\/favicon\.png"/);
  });

  it('keeps the page title as AEC ERP', () => {
    expect(html).toMatch(/<title>AEC ERP<\/title>/);
  });
});
