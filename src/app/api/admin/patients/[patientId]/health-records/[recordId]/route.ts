import { NextRequest } from "next/server";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { serializeHealthRecord } from "@/lib/http/serializers";
import { HealthRecordUpdateSchema, PatientService } from "@/modules/patient";
import { requireAdmin } from "@/lib/utils";

const response = new NextResponseHandler();

type RouteContext = {
  params: Promise<{ patientId: string; recordId: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin(request);
    const { patientId, recordId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return response.badRequest("Request body must be valid JSON.");
    }

    const parsedData = HealthRecordUpdateSchema.safeParse(body);
    if (!parsedData.success) {
      return response.badRequest(
        "Invalid request data.",
        parsedData.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      );
    }

    const record = await new PatientService().updateHealthRecord(patientId, recordId, parsedData.data);
    return response.success(serializeHealthRecord(record));
  } catch (error: unknown) {
    return response.fromError(error);
  }
}
