import type { ErrorDetail } from "@/lib/http/response-handler";

/**
 * Base for every error a module throws to signal an HTTP outcome.
 * Routes catch this one type via `response.fromError()` instead of
 * knowing each module's concrete error classes.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  readonly details?: ErrorDetail[];

  constructor(message: string, details?: ErrorDetail[]) {
    super(message);
    this.details = details;
  }
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = "VALIDATION_ERROR";
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = "UNAUTHORIZED";
  constructor(message = "Missing, invalid, expired or revoked bearer token.") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "FORBIDDEN";
  constructor(message = "You do not have access to this resource.") {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "NOT_FOUND";
  constructor(resource = "Resource") {
    super(`${resource} not found.`);
  }
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "ALREADY_EXISTS";
  readonly fields: string[];

  constructor(fields: string[], message = "A record with the same unique value already exists.") {
    super(
      message,
      fields.map((field) => ({ field, message: "Already in use" })),
    );
    this.fields = fields;
  }
}
