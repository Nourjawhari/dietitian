import { PageRecord, PageSectionRecord, PageWithoutSectionsRecord, SafePage, SafePageSection, SafePageWithoutSections } from "./page.types";

/** Strips internal fields from a Page and maps its sections. */
export function toSafePage(page: PageRecord): SafePage {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    language: page.language,
    updated_at: page.updatedAt,
    sections: page.sections.map(toSafePageSection),
  };
}

export function toSafePageSection(section: PageSectionRecord): SafePageSection {
  return {
    id: section.id,
    page_id: section.pageId,
    section_key: section.sectionKey,
    content: section.content,
    display_order: section.displayOrder,
  };
}

/** Same as toSafePage but for a Page fetched without its sections (e.g. after a page-fields-only update). */
export function toSafePageWithoutSections(page: PageWithoutSectionsRecord): SafePageWithoutSections {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    language: page.language,
    updated_at: page.updatedAt,
  };
}
