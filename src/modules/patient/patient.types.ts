import { z } from "zod";
import { Gender } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";

export const PatientSelfUpdateSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, e.g. +96170123456"),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format."),
    gender: z.enum(Gender),
    note: z.string().max(2000),
    whatsapp_opt_in: z.boolean(),
    ai_processing_consent: z.boolean(),
  })
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required.",
  })
  .transform((data) => ({
    fullName: data.full_name,
    phone: data.phone,
    dateOfBirth: data.date_of_birth,
    gender: data.gender,
    note: data.note,
    whatsappOptIn: data.whatsapp_opt_in,
    aiProcessingConsent: data.ai_processing_consent,
  }));

export type PatientSelfUpdateInput = z.infer<typeof PatientSelfUpdateSchema>;

/** Raw shape the mapper needs — independent of the repository's exact Prisma select. */
export type HealthRecordRecord = {
  id: string;
  patientId: string;
  recordedAt: Date;
  height: Prisma.Decimal;
  weight: Prisma.Decimal;
  bmi: Prisma.Decimal;
  isObese: boolean;
  chronicConditions: Prisma.JsonValue;
  allergies: Prisma.JsonValue;
  dietitianGoal: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PatientRecord = {
  id: string;
  userId: string;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  note: string | null;
  whatsappOptInAt: Date | null;
  aiProcessingConsentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: { fullName: string; email: string };
  healthRecords: HealthRecordRecord[];
};

export type SafeHealthRecord = {
  id: string;
  patientId: string;
  recordedAt: Date;
  height: number;
  weight: number;
  bmi: number;
  isObese: boolean;
  chronicConditions: string[];
  allergies: string[];
  dietitianGoal?: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Public-safe shape of a Patient profile — full_name/email are joined in from the linked User. */
export type SafePatient = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  note?: string;
  whatsappOptIn: boolean;
  aiProcessingConsent: boolean;
  latestHealthRecord?: SafeHealthRecord;
  createdAt: Date;
  updatedAt: Date;
};
