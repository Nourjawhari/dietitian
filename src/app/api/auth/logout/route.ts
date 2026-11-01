import { NextRequest } from "next/server";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { getBearerToken } from "@/lib/http/request";
import { AuthService } from "@/modules/auth";
import { UnauthorizedError } from "@/lib/errors";

const response = new NextResponseHandler();

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new UnauthorizedError();
    await new AuthService().logout(token);
    return response.noContent();
  } catch (error: unknown) {
    return response.fromError(error);
  }
}
