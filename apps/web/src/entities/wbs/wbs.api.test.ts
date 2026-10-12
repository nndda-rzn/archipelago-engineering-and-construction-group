import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useUpdateWbsItem, useDeleteWbsItem, useMoveWbsItem } from './wbs.api';

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

describe('WBS entity hooks', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.setItem('aec_token', 'test-token');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('useUpdateWbsItem PATCHes the item', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ id: 'w1', progressPercent: 55 }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const { result } = renderHook(() => useUpdateWbsItem('p1'), { wrapper: wrapper(client()) });
    result.current.mutate({ itemId: 'w1', input: { progressPercent: 55 } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain('/projects/p1/wbs/w1');
    expect((init as RequestInit).method).toBe('PATCH');
  });

  it('useDeleteWbsItem DELETEs the item', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('', { status: 200 }));
    const { result } = renderHook(() => useDeleteWbsItem('p1'), { wrapper: wrapper(client()) });
    result.current.mutate('w1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain('/projects/p1/wbs/w1');
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('useMoveWbsItem POSTs to the move endpoint', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ id: 'w1', parentId: 'w2' }), { status: 201, headers: { 'content-type': 'application/json' } }),
    );
    const { result } = renderHook(() => useMoveWbsItem('p1'), { wrapper: wrapper(client()) });
    result.current.mutate({ itemId: 'w1', parentId: 'w2' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain('/projects/p1/wbs/w1/move');
    expect((init as RequestInit).method).toBe('POST');
  });
});
