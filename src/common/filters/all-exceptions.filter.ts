import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global exception filter - Catches all exceptions and formats consistent error responses
 *
 * Features:
 * - Consistent error response format
 * - Prisma-specific error handling
 * - Request context logging for debugging
 * - Hides internal errors in production
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | undefined;

    // Handle HTTP exceptions (from NestJS)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, any>;
        message = res.message || message;
        errors = Array.isArray(res.message) ? res.message : undefined;
        if (errors) {
          message = 'Validation failed';
        }
      }
    }
    // Handle Prisma errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
    }
    // Handle Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
    }
    // Handle other errors
    else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
      // Don't expose internal error messages in production
      if (process.env.NODE_ENV === 'development') {
        message = exception.message;
      }
    }

    // Log the error with request context
    this.logger.error({
      message: `${request.method} ${request.url} - ${status} ${message}`,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userId: (request as any).user?.id,
      error: exception instanceof Error ? exception.message : 'Unknown error',
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Send consistent error response
    response.status(status).json({
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
      // Include request ID if available (for debugging)
      requestId: request.headers['x-request-id'] || undefined,
    });
  }

  /**
   * Handle Prisma-specific errors with user-friendly messages
   */
  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (error.meta?.target as string[])?.join(', ') || 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${target} already exists`,
        };
      }
      case 'P2003': {
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referenced record does not exist',
        };
      }
      case 'P2025': {
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
        };
      }
      case 'P2014': {
        // Required relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required relation constraint violated',
        };
      }
      default: {
        this.logger.error(`Unhandled Prisma error: ${error.code}`, error);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
        };
      }
    }
  }
}
