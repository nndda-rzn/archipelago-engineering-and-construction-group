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
});
