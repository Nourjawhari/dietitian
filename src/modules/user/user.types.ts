import { Language, Role } from "@/app/generated/prisma/enums";

/** Public-safe shape of a User — never includes passwordHash. */
export type SafeUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: Role;
  preferredLanguage: Language;
  createdAt: Date;
  updatedAt: Date;
};
