import { Language } from "@/app/generated/prisma/enums";
import z from "zod";

export const HealthTipCreateSchema = z
    .object({
        title: z.string().trim().min(1).max(200),
        content: z.string().trim().min(1),
        language: z.enum(Language),
        section_id: z.string().trim().min(1).optional(),
        is_published: z.boolean().default(false),
    })
    .transform((data) => ({
        title: data.title,
        content: data.content,
        language: data.language,
        sectionId: data.section_id,
        isPublished: data.is_published,
    }));

export type HealthTipCreateInput = z.infer<typeof HealthTipCreateSchema>;

export const HealthTipUpdateSchema = z
    .object({
        title: z.string().trim().min(1).max(200).optional(),
        content: z.string().trim().min(1).optional(),
        language: z.enum(Language).optional(),
        section_id: z.string().trim().min(1).optional(),
        is_published: z.boolean().default(false),
    })
    .transform((data) => ({
        title: data.title,
        content: data.content,
        language: data.language,
        sectionId: data.section_id,
        isPublished: data.is_published,
    }));

export type HealthTipUpdateInput = z.infer<typeof HealthTipUpdateSchema>;

/** Query-string filters for the list endpoints (values arrive as strings). */
export const HealthTipFilterSchema = z
  .object({
    language: z.enum(Language).optional(),
    is_published: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .transform((data) => ({
    language: data.language,
    isPublished: data.is_published,
  }));

export type HealthTipFilter = z.infer<typeof HealthTipFilterSchema>;

/** Raw shape the mapper needs — independent of the repository's exact Prisma select. */
export type HealthTipRecord = {
  id: string;
  sectionId: string | null;
  title: string;
  content: string;
  language: Language;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Public-safe shape of a health tip. */
export type SafeHealthTip = {
  id: string;
  sectionId?: string;
  title: string;
  content: string;
  language: Language;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};