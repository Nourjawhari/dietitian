import { NextRequest } from "next/server";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { serializePatient } from "@/lib/http/serializers";
import { PatientService, PatientSelfUpdateSchema } from "@/modules/patient";
import { requirePatient } from "@/lib/utils";

const response = new NextResponseHandler();

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
