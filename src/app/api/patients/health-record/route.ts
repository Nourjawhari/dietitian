import { NextRequest } from "next/server";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { serializeHealthRecord } from "@/lib/http/serializers";
import { HealthRecordCreateSchema, PatientService } from "@/modules/patient";
import { requirePatient } from "@/lib/utils";

const response = new NextResponseHandler();

export async function GET(request: NextRequest) {
  try {
    const userId = await requirePatient(request);
    const record = await new PatientService().getLatestHealthRecord(userId);
    return response.success(serializeHealthRecord(record));
  } catch (error: unknown) {
    return response.fromError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requirePatient(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return response.badRequest("Request body must be valid JSON.");
    }

    const parsedData = HealthRecordCreateSchema.safeParse(body);
    if (!parsedData.success) {
      return response.badRequest(
        "Invalid request data.",
        parsedData.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      );
    }

    const record = await new PatientService().addHealthRecord(userId, parsedData.data);
    return response.created(serializeHealthRecord(record));
  } catch (error: unknown) {
    return response.fromError(error);
  }
}
