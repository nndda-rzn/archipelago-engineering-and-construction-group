import { describe, expect, it } from 'vitest';
import { analyticsKeys } from './analytics.api';

describe('analyticsKeys trend/decomposition', () => {
  it('includes metric, bucket and filter in the trend-series key', () => {
    expect(analyticsKeys.trendSeries({ metric: 'cashIn', bucket: 'month' }, { legalEntityId: 'LE1' })).toEqual([
      'analytics-trend-series',
      { metric: 'cashIn', bucket: 'month' },
      { legalEntityId: 'LE1' },
    ]);
  });

  it('includes metric, dimension and filter in the decomposition key', () => {
    expect(analyticsKeys.decomposition({ metric: 'cashIn', dimension: 'client', limit: 10 }, {})).toEqual([
      'analytics-decomposition',
      { metric: 'cashIn', dimension: 'client', limit: 10 },
      {},
    ]);
  });
});
