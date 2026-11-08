import { Language } from "@/app/generated/prisma/enums";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { PageService } from "@/modules/page/page.service";
import { NextRequest } from "next/server";

const response = new NextResponseHandler();
type RouteContext = {
    params: Promise<{ slug: string}>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { slug } = await params;
        const language = request.nextUrl.searchParams.get("language");

        if (!language || !Object.values(Language).includes(language as Language)) {
            return response.badRequest("Invalid or missing language");
        }

        const page = await new PageService().getBySlug(language as Language, slug);

        if (!page) {
            return response.notFound("Page");
        }

        return response.success(page);
    } catch (error: unknown) {
        return response.fromError(error);
    }
}