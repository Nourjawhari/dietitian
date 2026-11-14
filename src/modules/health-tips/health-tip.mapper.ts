import { HealthTipRecord, SafeHealthTip } from "./health-tip.types.js";

export function toSafeHealthTip(tip: HealthTipRecord): SafeHealthTip {
  return {
    id: tip.id,
    sectionId: tip.sectionId ?? undefined,
    title: tip.title,
    content: tip.content,
    language: tip.language,
    isPublished: tip.isPublished,
    publishedAt: tip.publishedAt ?? undefined,
    createdAt: tip.createdAt,
    updatedAt: tip.updatedAt,
  };
}

/** API response shape (snake_case), matching the `HealthTip` schema in openapi.yaml. */
export function toHealthTipResponse(tip: SafeHealthTip) {
  return {
    id: tip.id,
    section_id: tip.sectionId ?? null,
    title: tip.title,
    content: tip.content,
    language: tip.language,
    is_published: tip.isPublished,
    published_at: tip.publishedAt?.toISOString() ?? null,
    created_at: tip.createdAt.toISOString(),
    updated_at: tip.updatedAt.toISOString(),
  };
}