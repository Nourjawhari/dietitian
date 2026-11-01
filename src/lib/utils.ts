import { NextRequest } from "next/server";
import { getBearerToken } from "./http/request";
import { ForbiddenError, UnauthorizedError } from "./errors";
import { AuthService } from "@/modules/auth";
import { Role } from "@/app/generated/prisma/enums";

export async function requirePatient(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) throw new UnauthorizedError();

  const user = await new AuthService().authenticate(token);
  if (user.role !== Role.patient) throw new ForbiddenError("This endpoint is only available to patients.");

  return user.id;
}