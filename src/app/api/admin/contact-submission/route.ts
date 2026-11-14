import { NextRequest, NextResponse } from "next/server";
import { ContactService, ContactSubmissionFilterSchema, toContactSubmissionResponse } from "@/modules/contact";
import { ListQuery } from "@/lib/listQuery";
import { requireAdmin } from "@/lib/utils";
import { NextResponseHandler } from "@/lib/http/response-handler";

const service = new ContactService();
const response = new NextResponseHandler();

/** GET /api/admin/contact-submissions — newest first, filterable by status. */
export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        const params = request.nextUrl.searchParams;
        const filter = ContactSubmissionFilterSchema.parse({
            status: params.get("status") ?? undefined,
        });
        const query = ListQuery.fromSearchParams(params);

        const { records, pagination } = await service.listAll(filter, query);

        return NextResponse.json({ data: records.map(toContactSubmissionResponse), pagination });
    } catch (error: unknown) {
        return response.fromError(error);
    }
}