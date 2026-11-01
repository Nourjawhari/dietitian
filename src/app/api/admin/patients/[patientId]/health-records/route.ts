import { NextRequest } from "next/server";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { serializeHealthRecord } from "@/lib/http/serializers";
import { HealthRecordCreateSchema, PatientService } from "@/modules/patient";
import { requireAdmin, requirePatient } from "@/lib/utils";

const response = new NextResponseHandler();

type RouteContext = {
  params: Promise<{ patientId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const userId = await requireAdmin(request);
    const { patientId }= await params;
    const records = await new PatientService().listHealthRecordsForPatient(patientId);
    const serializedRecords = records.map((record) =>
      serializeHealthRecord(record)
    );
    return response.success(serializedRecords);
  } catch (error: unknown) {
    return response.fromError(error);
  }
}

export async function POST(request: NextRequest,  { params }: RouteContext) {
  try {
    const userId = await requireAdmin(request);
    const { patientId }= await params;

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

    const record = await new PatientService().addHealthRecord(patientId, parsedData.data);
    return response.created(serializeHealthRecord(record));
  } catch (error: unknown) {
    return response.fromError(error);
  }
}