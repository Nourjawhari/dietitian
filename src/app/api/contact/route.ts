import { NextRequest, NextResponse } from "next/server";
import { ContactService, ContactSubmissionCreateSchema, toContactSubmissionResponse } from "@/modules/contact";
import { NextResponseHandler } from "@/lib/http/response-handler";

const service = new ContactService();
const response = new NextResponseHandler();

/** POST /api/contact — public consultation/contact form. */
export async function POST(request: NextRequest) {
  try {
    const input = ContactSubmissionCreateSchema.parse(await request.json());
    const submission = await service.submit(input);

    return NextResponse.json(toContactSubmissionResponse(submission), { status: 201 });
  }  catch (error: unknown) {
        return response.fromError(error);
    }
}