process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://aec:aec_dev_password@localhost:5432/aec_test?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'e2e-test-secret-that-is-longer-than-32-characters';
process.env.NODE_ENV = 'test';
