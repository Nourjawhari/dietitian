
import { Language, Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

// Section content validation

export const HeroContentSchema = z.object({
  heading: z.string().trim().min(1).max(200),
  body: z.string().trim().max(2000),
  image_url: z.string().trim().optional(),
}).strict();

// General JSON object validation.
// Supports nested objects, arrays, strings, numbers, booleans and null.
const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
);

// Content must be a JSON object, not an array or primitive.
const SectionContentSchema = z.record(
  z.string(),
  JsonValueSchema
);

/** Shared by create/update: content must match HeroContentSchema when the section's key is "hero". */
function validateHeroContent(
  section: { sectionKey?: string; content?: Record<string, Prisma.JsonValue> },
  ctx: z.RefinementCtx
) {
  if (section.sectionKey === "hero" && section.content !== undefined) {
    const result = HeroContentSchema.safeParse(section.content);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ["content", ...issue.path],
        });
      });
    }
  }
}

// Page section schemas

export const PageSectionCreateSchema = z.object({
  sectionKey: z.string().trim().min(2).max(100),
  content: SectionContentSchema.optional(),
  displayOrder: z.number().int().min(0).optional(),
}).strict().superRefine(validateHeroContent);

export type PageSectionCreateInput = z.infer<typeof PageSectionCreateSchema>;

export const PageSectionUpdateSchema = z
  .object({
    sectionKey: z.string().trim().min(2).max(100).optional(),
    content: SectionContentSchema.optional(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required.",
  })
  .superRefine(validateHeroContent);

export type PageSectionUpdateInput = z.infer<typeof PageSectionUpdateSchema>;

// Page schemas

export const PageCreateSchema = z.object({
  slug: z.string().trim().min(2).max(1000),
  title: z.string().trim().min(2).max(1000),
  language: z.enum(Language),
  sections: z.array(PageSectionCreateSchema).optional(),
}).strict();

export type PageCreateInput = z.infer<typeof PageCreateSchema>;

export const PageUpdateSchema = z
  .object({
    slug: z.string().trim().min(2).max(1000).optional(),
    title: z.string().trim().min(2).max(1000).optional(),
    language: z.enum(Language).optional()
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    {
      message: "At least one field is required.",
    }
  );

export type PageUpdateInput = z.infer<typeof PageUpdateSchema>;

// Raw database records
export type PageSectionRecord = {
  id: string;
  pageId: string;
  sectionKey: string | null;
  content: Prisma.JsonValue | null;
  displayOrder: number | null;
};

export type PageRecord = {
  id: string;
  slug: string;
  title: string;
  language: Language;
  updatedAt: Date | null;
  deletedAt: Date | null;
  sections: PageSectionRecord[];
};

export type PageWithoutSectionsRecord = {
  id: string;
  slug: string;
  title: string;
  language: Language;
  updatedAt: Date | null;
  deletedAt: Date | null
};

// Safe API response types

export type SafePageSection = {
  id: string;
  page_id: string;
  section_key: string | null;
  content: Prisma.JsonValue | null;
  display_order: number | null;
};

export type SafePage = {
  id: string;
  slug: string;
  title: string;
  language: Language;
  updated_at: Date | null;
  sections: SafePageSection[];
};

export type SafePageWithoutSections = Omit<SafePage, "sections">;
