import { Language } from "@/app/generated/prisma/enums";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { requireAdmin } from "@/lib/utils";
import { PageCreateSchema, PageService } from "@/modules/page";
import { NextRequest } from "next/server";

const response = new NextResponseHandler();

export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);
        const language = request.nextUrl.searchParams.get("language");

        if (!language || !Object.values(Language).includes(language as Language)) {
            return response.badRequest("Invalid or missing language");
        }

        const pages = await new PageService().listPages(language as Language);

        return response.success(pages);
    } catch (error: unknown) {
        return response.fromError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin(request);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return response.badRequest("Request body must be valid JSON.");
        }

        const parsedData = PageCreateSchema.safeParse(body);
        if (!parsedData.success) {
            return response.badRequest(
                "Invalid request data.",
                parsedData.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
            );
        }

        const page = await new PageService().create(parsedData.data);
        return response.created(page);
    } catch (error: unknown) {
        return response.fromError(error);
    }
}
