import { AllExceptionsFilter } from './all-exceptions.filter';
import { Prisma } from '@prisma/client';

function makeHost(): { host: never; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  };
  return { host: host as never, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('Prisma P2034 -> 409 RETRY_CONFLICT', () => {
    const { host, status, json } = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError('write conflict', {
      code: 'P2034',
      clientVersion: 'test',
    });

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'RETRY_CONFLICT' }) }),
    );
  });

  it('Prisma P2002 -> 409 DUPLICATE', () => {
    const { host, status, json } = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'DUPLICATE' }) }),
    );
  });

  it('Prisma ECONNREFUSED -> 503 DB_UNAVAILABLE (config error, not a generic 500)', () => {
    const { host, status, json } = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError('connect ECONNREFUSED', {
      code: 'ECONNREFUSED',
      clientVersion: 'test',
    });

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'DB_UNAVAILABLE' }) }),
    );
  });

  it('does not leak the database host or credentials in the 503 message', () => {
    const { host, json } = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError(
      'connect ECONNREFUSED postgresql://user:secret@localhost:5438/other_db',
      { code: 'ECONNREFUSED', clientVersion: 'test' },
    );

    filter.catch(err, host);

    const body = JSON.stringify(json.mock.calls[0]![0]);
    expect(body).not.toContain('secret');
    expect(body).not.toContain('5438');
    expect(body).not.toContain('other_db');
  });
});
