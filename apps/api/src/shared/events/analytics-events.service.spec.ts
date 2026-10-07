import { AnalyticsEventsService, type AnalyticsChangeEvent } from './analytics-events.service';

/**
 * Test event bus dengan Redis tiruan. Fokus: subscribe mengembalikan unsubscribe
 * yang benar-benar melepas listener (tidak bocor), dan publish tidak melempar
 * saat Redis bermasalah (degradasi anggun).
 */
function makeFakeRedis() {
  const listeners: Array<(channel: string, message: string) => void> = [];
  return {
    on: jest.fn((event: string, handler: (channel: string, message: string) => void) => {
      if (event === 'message') listeners.push(handler);
    }),
    off: jest.fn((event: string, handler: (channel: string, message: string) => void) => {
      const i = listeners.indexOf(handler);
      if (i >= 0) listeners.splice(i, 1);
    }),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
    __emit: (channel: string, message: string) => listeners.forEach((l) => l(channel, message)),
    __listenerCount: () => listeners.length,
  };
}

describe('AnalyticsEventsService', () => {
  let fake: ReturnType<typeof makeFakeRedis>;
  let service: AnalyticsEventsService;

  beforeEach(() => {
    fake = makeFakeRedis();
    // Ganti kedua koneksi Redis dengan tiruan yang sama.
    service = new AnalyticsEventsService();
    // Akses privat untuk test: ganti koneksi Redis dengan tiruan.
    // @ts-expect-error private field access in test
    service.publisher = fake;
    // @ts-expect-error private field access in test
    service.subscriber = fake;
  });

  it('publishes a change event with topic and timestamp', async () => {
    await service.publish('analytics');
    expect(fake.publish).toHaveBeenCalledTimes(1);
    const [channel, payload] = fake.publish.mock.calls[0] as [string, string];
    expect(channel).toBe('aec:analytics:changed');
    const parsed = JSON.parse(payload) as AnalyticsChangeEvent;
    expect(parsed.topic).toBe('analytics');
    expect(typeof parsed.at).toBe('string');
  });

  it('delivers subscribed events and removes the listener on unsubscribe', async () => {
    const received: AnalyticsChangeEvent[] = [];
    const unsubscribe = await service.subscribe((e) => received.push(e));

    fake.__emit('aec:analytics:changed', JSON.stringify({ topic: 'approval', at: '2026-01-01T00:00:00Z' }));
    expect(received).toHaveLength(1);
    expect(received[0]?.topic).toBe('approval');

    await unsubscribe();
    fake.__emit('aec:analytics:changed', JSON.stringify({ topic: 'again', at: '2026-01-01T00:00:00Z' }));
    expect(received).toHaveLength(1); // tidak bertambah setelah unsubscribe
  });

  it('ignores malformed messages instead of throwing', async () => {
    const received: AnalyticsChangeEvent[] = [];
    await service.subscribe((e) => received.push(e));
    expect(() => fake.__emit('aec:analytics:changed', 'not-json')).not.toThrow();
    expect(received).toHaveLength(0);
  });

  it('does not throw when publish fails (graceful degradation)', async () => {
    fake.publish.mockRejectedValueOnce(new Error('redis down'));
    await expect(service.publish('analytics')).resolves.toBeUndefined();
  });
});
