import { NextRequest } from "next/server";
import { Role } from "@/app/generated/prisma/enums";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { getBearerToken } from "@/lib/http/request";
import { serializePatient } from "@/lib/http/serializers";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { AuthService } from "@/modules/auth";
import { PatientService, PatientSelfUpdateSchema } from "@/modules/patient";

const response = new NextResponseHandler();

async function requirePatient(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) throw new UnauthorizedError();

  const user = await new AuthService().authenticate(token);
  if (user.role !== Role.patient) throw new ForbiddenError("This endpoint is only available to patients.");

  return user.id;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requirePatient(request);
    const patient = await new PatientService().getProfile(userId);
    return response.success(serializePatient(patient));
  } catch (error: unknown) {
    return response.fromError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requirePatient(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return response.badRequest("Request body must be valid JSON.");
    }

    const parsedData = PatientSelfUpdateSchema.safeParse(body);
    if (!parsedData.success) {
      return response.badRequest(
        "Invalid request data.",
        parsedData.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      );
    }

    const patient = await new PatientService().updateProfile(userId, parsedData.data);
    return response.success(serializePatient(patient));
  } catch (error: unknown) {
    return response.fromError(error);
  }
}
