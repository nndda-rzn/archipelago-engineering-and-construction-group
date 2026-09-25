import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { ApiError } from '@aec/api-contracts';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const correlationId = randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Terjadi kesalahan internal';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string) ?? message;
        code = (body.code as string) ?? code;
        details = body.details;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {

      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      code = mapped.code;
      message = mapped.message;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'INVALID_QUERY';
      message = 'Query tidak valid';
    } else {

      this.logger.error(
        `Unhandled exception correlationId=${correlationId}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiError = {
      error: { code, message, details, correlationId },
    };

    response.status(status).json(body);
  }

  private mapPrismaError(e: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
  } {
    switch (e.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, code: 'DUPLICATE', message: 'Data sudah ada (unik bertabrakan)' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND', message: 'Data tidak ditemukan' };
      case 'P2003':
        return { status: HttpStatus.CONFLICT, code: 'FK_VIOLATION', message: 'Data terkait belum ada / tidak valid' };
      case 'P2000':
        return { status: HttpStatus.BAD_REQUEST, code: 'INVALID_DATA', message: 'Nilai terlalu panjang atau tidak valid' };
      case 'P2014':
        return { status: HttpStatus.CONFLICT, code: 'RELATION_VIOLATION', message: 'Relasi data tidak valid' };
      case 'P2034':
        return { status: HttpStatus.CONFLICT, code: 'RETRY_CONFLICT', message: 'Konflik transaksi bersamaan, silakan coba lagi' };
      default:
        this.logger.error(`Unhandled Prisma error code=${e.code}`, e.stack);
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan internal' };
    }
  }
}
