import { NextRequest, NextResponse } from "next/server";
import {
    ContactService,
    ContactSubmissionStatusUpdateSchema,
    toContactSubmissionResponse,
} from "@/modules/contact";
import { requireAdmin } from "@/lib/utils";
import { NextResponseHandler } from "@/lib/http/response-handler";


const service = new ContactService();
const response = new NextResponseHandler();

type RouteContext = { params: Promise<{ submissionId: string }> };

/** GET /api/admin/contact-submissions/{submissionId} */
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        await requireAdmin(request);

        const { submissionId } = await params;
        const submission = await service.getById(submissionId);

        return NextResponse.json(toContactSubmissionResponse(submission));
    } catch (error: unknown) {
        return response.fromError(error);
    }
}

/** PUT /api/admin/contact-submissions/{submissionId} — update status only. */
export async function PUT(request: NextRequest, { params }: RouteContext) {
    try {
        await requireAdmin(request);

        const { submissionId } = await params;
        const input = ContactSubmissionStatusUpdateSchema.parse(await request.json());
        const submission = await service.updateStatus(submissionId, input);

        return NextResponse.json(toContactSubmissionResponse(submission));
    } catch (error: unknown) {
        return response.fromError(error);
    }
}