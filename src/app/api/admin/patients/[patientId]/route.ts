import { NextRequest } from "next/server";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { serializePatient } from "@/lib/http/serializers";
import { PatientService } from "@/modules/patient";
import { requireAdmin } from "@/lib/utils";
import { PatientUpdateSchema } from "@/modules/patient/patient.types";

const response = new NextResponseHandler();
type RouteContext = {
  params: Promise<{ patientId: string }>;
};


export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin(request);
    const { patientId }= await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return response.badRequest("Request body must be valid JSON.");
    }

    const parsedData = PatientUpdateSchema.safeParse(body);
    if (!parsedData.success) {
      return response.badRequest(
        "Invalid request data.",
        parsedData.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      );
    }

    const patient = await new PatientService().updateFullPatient(patientId, parsedData.data);
    return response.success(serializePatient(patient));
  } catch (error: unknown) {
    return response.fromError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        await requireAdmin(request);
        const { patientId } = await params;

        await new PatientService().deletePatient(patientId);
        return response.noContent();
    } catch (error: unknown) {
        return response.fromError(error);
    }
}