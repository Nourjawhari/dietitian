import { Language, Role } from "@/app/generated/prisma/enums";
import { SafeUser } from "./user.types";

type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  preferredLanguage: Language;
  createdAt: Date;
  updatedAt: Date;
};

/** Strips sensitive/internal fields (passwordHash, deletedAt, ...) off a User row. */
export function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber ?? undefined,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
