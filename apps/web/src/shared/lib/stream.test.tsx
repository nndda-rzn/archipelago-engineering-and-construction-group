import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { openAnalyticsStream } from './stream';
import { useLiveAnalytics } from '@/features/analytics/model/use-live-analytics';

/** Bangun ReadableStream dari daftar blok SSE (dipisah `\n\n`). */
function sseStream(blocks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const b of blocks) controller.enqueue(enc.encode(`${b}\n\n`));
      controller.close();
    },
  });
}

describe('openAnalyticsStream', () => {
  beforeEach(() => {
    localStorage.setItem('aec_token', 'tok');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('sends the Bearer token in a header, not the query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, body: sseStream(['event: ready\ndata: {}']) });
    vi.stubGlobal('fetch', fetchMock);

    const onChange = vi.fn();
    const close = openAnalyticsStream({ onChange });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/analytics/stream');
    expect(url).not.toContain('token');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    close();
  });

  it('parses change events and calls onChange', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: sseStream(['event: ready\ndata: {}', 'event: change\ndata: {"topic":"analytics","at":"2026-01-01T00:00:00Z"}']),
      }),
    );
    const onChange = vi.fn();
    const onReady = vi.fn();
    openAnalyticsStream({ onChange, onReady });
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith({ topic: 'analytics', at: '2026-01-01T00:00:00Z' }));
    expect(onReady).toHaveBeenCalled();
  });

  it('ignores heartbeat comment blocks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, body: sseStream([': ping 123', 'event: change\ndata: {"topic":"x","at":"t"}']) }),
    );
    const onChange = vi.fn();
    openAnalyticsStream({ onChange });
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  });

  it('calls onError when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, body: null }));
    const onError = vi.fn();
    openAnalyticsStream({ onChange: vi.fn(), onError });
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
  });
});

describe('useLiveAnalytics', () => {
  function wrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('does not open a stream when disabled', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderHook(() => useLiveAnalytics(false), { wrapper });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens a stream when enabled', async () => {
    localStorage.setItem('aec_token', 'tok');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, body: sseStream(['event: ready\ndata: {}']) });
    vi.stubGlobal('fetch', fetchMock);
    renderHook(() => useLiveAnalytics(true), { wrapper });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/analytics/stream', expect.anything()));
  });

  it('exposes setEnabled to toggle live', () => {
    const { result } = renderHook(() => useLiveAnalytics(true), { wrapper });
    expect(result.current.enabled).toBe(true);
    act(() => result.current.setEnabled(false));
    expect(result.current.enabled).toBe(false);
  });
});
