import { Language } from "@/app/generated/prisma/enums";
import { toSafePage, toSafePageSection, toSafePageWithoutSections } from "./page.mapper";
import { PageRepository } from "./page.repository";
import { PageCreateInput, PageSectionUpdateInput, PageUpdateInput, SafePage, SafePageSection, SafePageWithoutSections } from "./page.types";

export class PageService {
    async listPages(language: Language): Promise<SafePage[]> {
        const pages = await PageRepository.listPages(language);
        return pages.map(toSafePage);
    }

    async getBySlug(language: Language, slug: string): Promise<SafePage | null> {
        const page = await PageRepository.getBySlug(language, slug);
        return page ? toSafePage(page) : null;
    }

    async getById(id: string): Promise<SafePage | null> {
        const page = await PageRepository.getById(id);
        return page ? toSafePage(page) : null;
    }

    async create(input: PageCreateInput): Promise<SafePage> {
        const page = await PageRepository.create(input);
        return toSafePage(page);
    }

    async update(id: string, input: PageUpdateInput): Promise<SafePageWithoutSections> {
        const page = await PageRepository.update(id, input);
        return toSafePageWithoutSections(page);
    }

    async delete(id: string): Promise<void> {
        await PageRepository.delete(id);
    }

    async updateSection(pageId: string, sectionId: string, input: PageSectionUpdateInput): Promise<SafePageSection> {
        const section = await PageRepository.updateSection(pageId, sectionId, input);
        return toSafePageSection(section);
    }

    async deleteSection(pageId: string, sectionId: string): Promise<void> {
        await PageRepository.deleteSection(pageId, sectionId);
    }
}
