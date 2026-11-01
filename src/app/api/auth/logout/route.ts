import { NextRequest } from "next/server";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { AuthService } from "@/modules/auth";
import { UnauthorizedError } from "@/lib/errors";

const response = new NextResponseHandler();

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");

  try {
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedError();
    }
    await new AuthService().logout(token);
    return response.noContent();
  } catch (error: unknown) {
    return response.fromError(error);
  }
}
