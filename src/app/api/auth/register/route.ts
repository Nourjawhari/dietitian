import { NextRequest } from "next/server";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { serializeUser } from "@/lib/http/serializers";
import { AuthService, RegisterSchema } from "@/modules/auth";

const response = new NextResponseHandler();

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response.badRequest("Request body must be valid JSON.");
  }

  const parsedData = RegisterSchema.safeParse(body);
  if (!parsedData.success) {
    return response.badRequest(
      "Invalid request data.",
      parsedData.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
    );
  }

  try {
    const user = await new AuthService().register(parsedData.data);
    return response.created({ user: serializeUser(user) });
  } catch (error: unknown) {
    return response.fromError(error);
  }
}
