import { Language } from "@/app/generated/prisma/enums";
import { PageCreateInput, PageRecord, PageSectionRecord, PageSectionUpdateInput, PageUpdateInput, PageWithoutSectionsRecord, HeroContentSchema } from "./page.types";
import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";

export class PageRepository {
    static async listPages(language: Language): Promise<PageRecord[]> {
        return prisma.page.findMany({
            where: {
                language,
                deletedAt: null
            },
            orderBy: {
                updatedAt: 'desc'
            },
            include: {
                sections: {
                    orderBy: { displayOrder: 'asc' }
                }
            }
        });
    }

    static async getBySlug(language: Language, slug: string): Promise<PageRecord | null> {
        return prisma.page.findFirst({
            where: {
                language,
                slug,
                deletedAt: null
            },
            include: {
                sections: {
                    orderBy: { displayOrder: 'asc' }
                }
            }
        })
    }

    static async getById(id: string): Promise<PageRecord | null> {
        return prisma.page.findFirst({
            where: {
                id,
                deletedAt: null
            },
            include: {
                sections: {
                    orderBy: { displayOrder: 'asc' }
                }
            }
        })
    }

    static async create(input: PageCreateInput): Promise<PageRecord> {
        return prisma.page.create({
            data: {
                slug: input.slug,
                title: input.title,
                language: input.language,
                sections: input.sections ? { create: input.sections } : undefined
            },
            include: {
                sections: {
                    orderBy: { displayOrder: 'asc' }
                }
            }
        });
    }

    static async update(id: string, input: PageUpdateInput): Promise<PageWithoutSectionsRecord> {
        await this.findActivePage(id);

        return prisma.page.update({
            where: { id },
            data: input
        });
    }

    static async delete(id: string): Promise<void> {
        await this.findActivePage(id);

        await prisma.page.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }

    static async updateSection(
        pageId: string,
        sectionId: string,
        input: PageSectionUpdateInput
    ): Promise<PageSectionRecord> {
        const existing = await this.findActiveSection(pageId, sectionId);

        // sectionKey may be omitted on update, so fall back to the existing
        // key to still catch a hero section's content being changed in place.
        const effectiveSectionKey = input.sectionKey ?? existing.sectionKey;
        if (effectiveSectionKey === "hero" && input.content !== undefined) {
            const result = HeroContentSchema.safeParse(input.content);

            if (!result.success) {
                throw new ValidationError(
                    "Invalid request data.",
                    result.error.issues.map((issue) => ({
                        field: ["content", ...issue.path].join("."),
                        message: issue.message,
                    })),
                );
            }
        }

        return prisma.pageSection.update({
            where: { id: sectionId },
            data: {
                sectionKey: input.sectionKey,
                content: input.content,
                displayOrder: input.displayOrder
            }
        });
    }

    private static async findActivePage(id: string): Promise<{ id: string }> {
        const page = await prisma.page.findFirst({
            where: { id, deletedAt: null },
            select: { id: true }
        });

        if (!page) throw new NotFoundError("Page");

        return page;
    }

    private static async findActiveSection(pageId: string, sectionId: string): Promise<PageSectionRecord> {
        await this.findActivePage(pageId);

        const section = await prisma.pageSection.findFirst({
            where: { id: sectionId, pageId }
        });

        if (!section) throw new NotFoundError("Page section");

        return section;
    }

    static async deleteSection(pageId: string, sectionId: string): Promise<void> {
        await this.findActiveSection(pageId, sectionId);

        await prisma.pageSection.delete({
            where: { id: sectionId }
        });
    }
}
