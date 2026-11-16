import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorisedError,
  ValidationError,
} from "@greenquote/domain";
import { ArgumentsHost, Catch, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import type { Response } from "express";

const statusByError = [
  [ValidationError, HttpStatus.BAD_REQUEST],
  [UnauthorisedError, HttpStatus.UNAUTHORIZED],
  [ForbiddenError, HttpStatus.FORBIDDEN],
  [NotFoundError, HttpStatus.NOT_FOUND],
  [ConflictError, HttpStatus.CONFLICT],
] as const;

/** Maps domain errors to HTTP; everything else falls through to Nest (HttpExceptions as-is, the rest a logged generic 500). */
@Catch()
export class DomainExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost) {
    const status = statusByError.find(
      ([type]) => exception instanceof type,
    )?.[1];
    if (status === undefined || !(exception instanceof DomainError)) {
      super.catch(exception, host);
      return;
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        statusCode: status,
        message: exception.message,
        // Same shape as the Zod pipe's field errors, so clients handle both alike.
        ...(exception instanceof ValidationError && exception.path
          ? { errors: [{ path: exception.path, message: exception.message }] }
          : {}),
      });
  }
}
