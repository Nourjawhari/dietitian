import { Language } from "@/app/generated/prisma/enums";
import { NextResponseHandler } from "@/lib/http/response-handler";
import { PageService } from "@/modules/page/page.service";
import { NextRequest } from "next/server";

const response = new NextResponseHandler();

export async function GET(request: NextRequest) {
    try {
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