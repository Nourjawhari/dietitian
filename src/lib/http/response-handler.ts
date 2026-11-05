import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { Prisma } from "@/app/generated/prisma/client";

export type ErrorDetail = { field: string; message: string };
export type Pagination = { page: number; page_size: number; total_items: number; total_pages: number };

export interface IResponseHandler {
  success<T>(data: T, status?: number): NextResponse;
  created<T>(data: T): NextResponse;
  noContent(): NextResponse;
  paginated<T>(items: T[], pagination: Pagination): NextResponse;
  fail(status: number, code: string, message: string, details?: ErrorDetail[]): NextResponse;
  badRequest(message: string, details?: ErrorDetail[]): NextResponse;
  unauthorized(message?: string): NextResponse;
  forbidden(message?: string): NextResponse;
  notFound(resource?: string): NextResponse;
  conflict(message: string, details?: ErrorDetail[]): NextResponse;
  unprocessable(code: string, message: string): NextResponse;
  serverError(error?: unknown): NextResponse;
  fromError(error: unknown): NextResponse;
}

export class NextResponseHandler implements IResponseHandler {
  // ── Success ──
  success<T>(data: T, status = 200): NextResponse {
    return NextResponse.json(data, { status });
  }

  created<T>(data: T): NextResponse {
    return this.success(data, 201);
  }

  noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  paginated<T>(items: T[], pagination: Pagination): NextResponse {
    return this.success({ data: items, pagination });
  }

  // ── Errors (shape matches the API's Error schema) ──
  fail(status: number, code: string, message: string, details?: ErrorDetail[]): NextResponse {
    return NextResponse.json({ code, message, ...(details && { details }) }, { status });
  }

  badRequest(message: string, details?: ErrorDetail[]): NextResponse {
    return this.fail(400, "VALIDATION_ERROR", message, details);
  }

  unauthorized(message = "Missing, invalid, expired or revoked bearer token."): NextResponse {
    return this.fail(401, "UNAUTHORIZED", message);
  }

  forbidden(message = "You do not have access to this resource."): NextResponse {
    return this.fail(403, "FORBIDDEN", message);
  }

  notFound(resource = "Resource"): NextResponse {
    return this.fail(404, "NOT_FOUND", `${resource} not found.`);
  }

  conflict(message: string, details?: ErrorDetail[]): NextResponse {
    return this.fail(409, "ALREADY_EXISTS", message, details);
  }

  unprocessable(code: string, message: string): NextResponse {
    return this.fail(422, code, message);
  }

  serverError(error?: unknown): NextResponse {
    if (error) console.error(error);
    return this.fail(500, "INTERNAL_ERROR", "Something went wrong.");
  }

  // ── Catch-all for route handlers: routes never need to know which
  // concrete error class a module throws. ──
  fromError(error: unknown): NextResponse {
    if (error instanceof AppError) {
        return this.fail(error.status, error.code, error.message, error.details);
    }

    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    ) {
        return this.conflict("A record with this value already exists.");
    }

    return this.serverError(error);
}
}