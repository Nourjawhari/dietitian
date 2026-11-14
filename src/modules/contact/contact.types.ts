import { z } from "zod";
import { ContactSubmissionStatus } from "@/app/generated/prisma/enums";

export const ContactSubmissionCreateSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, e.g. +96170123456").optional(),
    subject: z.string().trim().max(200).optional(),
    message: z.string().trim().min(1).max(5000),
  })
  .transform((data) => ({
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    subject: data.subject,
    message: data.message,
  }));

export type ContactSubmissionCreateInput = z.infer<typeof ContactSubmissionCreateSchema>;

export const ContactSubmissionStatusUpdateSchema = z
  .object({
    status: z.enum(ContactSubmissionStatus),
  })
  .transform((data) => ({
    status: data.status,
  }));

export type ContactSubmissionStatusUpdateInput = z.infer<typeof ContactSubmissionStatusUpdateSchema>;

/** Query-string filters for the admin list. */
export const ContactSubmissionFilterSchema = z
  .object({
    status: z.enum(ContactSubmissionStatus).optional(),
  })
  .transform((data) => ({
    status: data.status,
  }));

export type ContactSubmissionFilter = z.infer<typeof ContactSubmissionFilterSchema>;

/** Raw shape the mapper needs — independent of the repository's exact Prisma select. */
export type ContactSubmissionRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: ContactSubmissionStatus;
  submittedAt: Date;
  updatedAt: Date | null;
};

export type SafeContactSubmission = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: ContactSubmissionStatus;
  submittedAt: Date;
  updatedAt?: Date;
};