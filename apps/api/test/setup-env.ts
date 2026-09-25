process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://aec:aec_dev_password@localhost:5432/aec_test?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'e2e-test-secret-that-is-longer-than-32-characters';
process.env.NODE_ENV = 'test';

// Longgarkan throttle di test: suite e2e (mis. penyiapan fixture & uji konkurensi)
// mengirim banyak request beruntun dan tak boleh ditolak 429 oleh burst limit produksi.
process.env.THROTTLE_LIMIT_SHORT = process.env.THROTTLE_LIMIT_SHORT ?? '1000';
process.env.THROTTLE_LIMIT_MEDIUM = process.env.THROTTLE_LIMIT_MEDIUM ?? '10000';
