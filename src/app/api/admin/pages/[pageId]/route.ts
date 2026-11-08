import { NextResponseHandler } from "@/lib/http/response-handler";
import { requireAdmin } from "@/lib/utils";
import { PageService, PageUpdateSchema } from "@/modules/page";
import { NextRequest } from "next/server";

const response = new NextResponseHandler();
type RouteContext = {
    params: Promise<{ pageId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        await requireAdmin(request);
        const { pageId } = await params;
        const page = await new PageService().getById(pageId);

        if (!page) {
            return response.notFound("Page");
        }

        return response.success(page);
    } catch (error: unknown) {
        return response.fromError(error);
    }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin(request);
    const { pageId }= await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return response.badRequest("Request body must be valid JSON.");
    }

    const parsedData = PageUpdateSchema.safeParse(body);
    if (!parsedData.success) {
      return response.badRequest(
        "Invalid request data.",
        parsedData.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      );
    }

    const page = await new PageService().update(pageId, parsedData.data);
    return response.success(page);
  } catch (error: unknown) {
    return response.fromError(error);
  }
}

async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        await requireAdmin(request);
        const { pageId } = await params;

        await new PageService().delete(pageId);
        return response.noContent();
    } catch (error: unknown) {
        return response.fromError(error);
    }
}
