import { NextResponseHandler } from "@/lib/http/response-handler";
import { requireAdmin } from "@/lib/utils";
import { PageSectionUpdateSchema, PageService } from "@/modules/page";
import { NextRequest } from "next/server";

const response = new NextResponseHandler();
type RouteContext = {
  params: Promise<{ pageId: string; sectionId: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin(request);
    const { pageId, sectionId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return response.badRequest("Request body must be valid JSON.");
    }

    const parsedData = PageSectionUpdateSchema.safeParse(body);
    if (!parsedData.success) {
      return response.badRequest(
        "Invalid request data.",
        parsedData.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      );
    }

    const section = await new PageService().updateSection(pageId, sectionId, parsedData.data);
    return response.success(section);
  } catch (error: unknown) {
    return response.fromError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin(request);
    const { pageId, sectionId } = await params;

    await new PageService().deleteSection(pageId, sectionId);
    return response.noContent();
  } catch (error: unknown) {
    return response.fromError(error);
  }
}
