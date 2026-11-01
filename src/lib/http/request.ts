import { NextRequest } from "next/server";

/** Extracts the bearer token from the Authorization header, or null if missing/malformed. */
export function getBearerToken(request: NextRequest): string | null {
  const [scheme, token] = (request.headers.get("authorization") ?? "").split(" ");
  return scheme === "Bearer" && token ? token : null;
}
