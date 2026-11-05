import { NextRequest } from "next/server";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { serializePatient } from "@/lib/http/serializers";
import { PatientService } from "@/modules/patient";
import { requireAdmin } from "@/lib/utils";
import { toSafePatient } from "@/modules/patient/patient.mapper";
import { ListQuery } from "@/lib/listQuery";
import { PatientCreateSchema } from "@/modules/patient/patient.types";

const response = new NextResponseHandler();

export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        const query = ListQuery.fromSearchParams(request.nextUrl.searchParams);
        const { records , pagination } = await new PatientService().listPatients(query);

        return response.success({
            items: records.map((patient) =>
                serializePatient(toSafePatient(patient))
            ),pagination
        });
    } catch (error: unknown) {
        return response.fromError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await requireAdmin(request);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return response.badRequest("Request body must be valid JSON.");
        }

        const parsedData = PatientCreateSchema.safeParse(body);
        if (!parsedData.success) {
            return response.badRequest(
                "Invalid request data.",
                parsedData.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
            );
        }

        const record = await new PatientService().createFullPatient(userId, parsedData.data);
        return response.created(serializePatient(record));
    } catch (error: unknown) {
        return response.fromError(error);
    }
}