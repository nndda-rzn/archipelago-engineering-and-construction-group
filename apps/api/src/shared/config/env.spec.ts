import { describeDatabaseTarget, describeEnvOverrides } from './env';

describe('describeDatabaseTarget', () => {
  it('extracts host, port and database name for a log line', () => {
    const target = describeDatabaseTarget('postgresql://aec:secret@localhost:5432/aec_erp?schema=public');
    expect(target).toEqual({ host: 'localhost', port: '5432', database: 'aec_erp' });
  });

  it('never leaks the password', () => {
    const target = describeDatabaseTarget('postgresql://user:sup3rsecret@db.internal:5438/other_db');
    expect(JSON.stringify(target)).not.toContain('sup3rsecret');
  });

  it('returns null for an unparseable url (never throws)', () => {
    expect(describeDatabaseTarget('not-a-url')).toBeNull();
    expect(describeDatabaseTarget('')).toBeNull();
  });
});

describe('describeEnvOverrides', () => {
  it('reports DATABASE_URL as an override when present in the process env', () => {
    expect(describeEnvOverrides({ DATABASE_URL: 'postgresql://x:y@h:1/d' })).toContain('DATABASE_URL');
  });

  it('is empty when no known key is set in the process env', () => {
    expect(describeEnvOverrides({})).toEqual([]);
  });

  it('flags every known key that would silently beat the .env file', () => {
    const overrides = describeEnvOverrides({
      DATABASE_URL: 'postgresql://x:y@h:1/d',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'a'.repeat(40),
    });
    expect(overrides.sort()).toEqual(['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL']);
  });
});
