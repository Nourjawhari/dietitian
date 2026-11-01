import { Language } from "@/app/generated/prisma/enums";
import z from "zod";

export const RegisterSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100),
    email: z.email().toLowerCase(),
    password: z.string().min(8).max(72),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, e.g. +96170123456"),
    preferred_language: z.enum(Language).default(Language.en),
    whatsapp_opt_in: z.boolean().default(false),
  })
  .transform((data) => ({
    fullName: data.full_name,
    email: data.email,
    password: data.password,
    phoneNumber: data.phone,
    preferredLanguage: data.preferred_language,
    whatsappOptIn: data.whatsapp_opt_in,
  }));

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof LoginSchema>;
