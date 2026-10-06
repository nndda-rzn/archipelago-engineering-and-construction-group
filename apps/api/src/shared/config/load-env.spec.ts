import { shouldOverrideFromDotenv } from './load-env';

describe('shouldOverrideFromDotenv', () => {
  it('overrides in development so the project .env beats a stray global var', () => {
    expect(shouldOverrideFromDotenv('development')).toBe(true);
  });

  it('does not override in test — injected TEST_DATABASE_URL must win', () => {
    expect(shouldOverrideFromDotenv('test')).toBe(false);
  });

  it('does not override in production — platform-injected config must win', () => {
    expect(shouldOverrideFromDotenv('production')).toBe(false);
  });

  it('defaults to development when NODE_ENV is unset or empty', () => {
    expect(shouldOverrideFromDotenv(undefined)).toBe(true);
    expect(shouldOverrideFromDotenv('')).toBe(true);
  });
});
