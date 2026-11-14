import { NextRequest, NextResponse } from "next/server";
import { HealthTipService, HealthTipUpdateSchema } from "@/modules/health-tips";
import { requireAdmin } from "@/lib/utils";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { toHealthTipResponse } from "@/modules/health-tips/health-tip.mapper";

const service = new HealthTipService();
const response = new NextResponseHandler();

type RouteContext = { params: Promise<{ tipId: string }> };

/** PUT /api/admin/health-tips/{tipId} — partial update; `section_id: null` unlinks the section. */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin(request);

    const { tipId } = await params;
    const input = HealthTipUpdateSchema.parse(await request.json());
    const tip = await service.update(tipId, input);

    return NextResponse.json(toHealthTipResponse(tip));
  }  catch (error: unknown) {
        return response.fromError(error);
    }
}

/** DELETE /api/admin/health-tips/{tipId} */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin(request);

    const { tipId } = await params;
    await service.delete(tipId);

    return new NextResponse(null, { status: 204 });
  }  catch (error: unknown) {
        return response.fromError(error);
    }
}