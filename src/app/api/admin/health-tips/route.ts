import { NextRequest, NextResponse } from "next/server";
import {
    HealthTipCreateSchema,
    HealthTipFilterSchema,
    HealthTipService,
} from "@/modules/health-tips";
import { ListQuery } from "@/lib/listQuery";
import { requireAdmin } from "@/lib/utils";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { toHealthTipResponse } from "@/modules/health-tips/health-tip.mapper";

const service = new HealthTipService();
const response = new NextResponseHandler();

/** GET /api/admin/health-tips — all tips, filterable by language and is_published. */
export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        const params = request.nextUrl.searchParams;
        const filter = HealthTipFilterSchema.parse({
            language: params.get("language") ?? undefined,
            is_published: params.get("is_published") ?? undefined,
        });
        const query = ListQuery.fromSearchParams(params);

        const { records, pagination } = await service.listAll(filter, query);

        return NextResponse.json({ data: records.map(toHealthTipResponse), pagination });
    } catch (error: unknown) {
        return response.fromError(error);
    }
}

/** POST /api/admin/health-tips — create a tip. */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin(request);

        const input = HealthTipCreateSchema.parse(await request.json());
        const tip = await service.create(input);

        return NextResponse.json(toHealthTipResponse(tip), { status: 201 });
    } catch (error: unknown) {
        return response.fromError(error);
    }
}