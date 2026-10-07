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
    let message = 'Internal server error';
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
      message = 'Invalid query';
    } else {

      this.logger.error(
        `Unhandled exception correlationId=${correlationId}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiError = {
      error: { code, message, details, correlationId },
    };

    // Sebagian respons (mis. SSE/streaming) sudah mengirim header sebelum error
    // muncul. Menulis lagi akan melempar ERR_HTTP_HEADERS_SENT dan — lebih buruk —
    // merobohkan proses. Bila header sudah terkirim, cukup akhiri respons.
    if (response.headersSent) {
      if (!response.writableEnded) response.end();
      return;
    }

    response.status(status).json(body);
  }

  private mapPrismaError(e: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
  } {
    switch (e.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, code: 'DUPLICATE', message: 'Record already exists (unique constraint violated)' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND', message: 'Record not found' };
      case 'P2003':
        return { status: HttpStatus.CONFLICT, code: 'FK_VIOLATION', message: 'Referenced record does not exist or is invalid' };
      case 'P2000':
        return { status: HttpStatus.BAD_REQUEST, code: 'INVALID_DATA', message: 'Value is too long or invalid' };
      case 'P2014':
        return { status: HttpStatus.CONFLICT, code: 'RELATION_VIOLATION', message: 'Invalid data relation' };
      case 'P2034':
        return { status: HttpStatus.CONFLICT, code: 'RETRY_CONFLICT', message: 'Concurrent transaction conflict, please retry' };
      // Database tidak terjangkau — hampir selalu konfigurasi (host/port salah,
      // env var menimpa .env, atau DB memang mati). 503, bukan 500, agar jelas
      // ini masalah ketersediaan dan bukan bug permintaan. Detail koneksi
      // sengaja TIDAK diteruskan ke klien (bisa memuat kredensial).
      case 'ECONNREFUSED':
      case 'P1001':
      case 'P1002':
        return { status: HttpStatus.SERVICE_UNAVAILABLE, code: 'DB_UNAVAILABLE', message: 'Database is unavailable' };
      default:
        this.logger.error(`Unhandled Prisma error code=${e.code}`, e.stack);
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'Internal server error' };
    }
  }
}
