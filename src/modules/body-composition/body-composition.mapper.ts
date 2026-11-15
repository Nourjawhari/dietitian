import { Prisma } from "@/app/generated/prisma/client";
import { BodyCompositionReportRecord, SafeBodyCompositionReport } from "./body-composition.types";

const toNumber = (value: Prisma.Decimal | null): number | undefined =>
  value === null ? undefined : Number(value);

/** `fileUrl` is a short-lived signed URL built by the service from `filePath`. */
export function toSafeBodyCompositionReport(
  record: BodyCompositionReportRecord,
  fileUrl: string
): SafeBodyCompositionReport {
  return {
    id: record.id,
    patientId: record.patientId,
    fileUrl,
    extractionStatus: record.extractionStatus,
    bodyFatPercentage: toNumber(record.bodyFatPercentage),
    muscleMass: toNumber(record.muscleMass),
    visceralFatLevel: toNumber(record.visceralFatLevel),
    basalMetabolicRate: toNumber(record.basalMetabolicRate),
    extractionError: record.extractionError ?? undefined,
    reviewedByDietitian: record.reviewedByDietitian,
    reviewedByUserId: record.reviewedByUserId ?? undefined,
    reviewedAt: record.reviewedAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt ?? undefined,
  };
}

/** API response shape (snake_case), matching the `BodyCompositionReport` schema in openapi.yaml. */
export function toBodyCompositionReportResponse(report: SafeBodyCompositionReport) {
  return {
    id: report.id,
    patient_id: report.patientId,
    file_url: report.fileUrl,
    extraction_status: report.extractionStatus,
    body_fat_percentage: report.bodyFatPercentage ?? null,
    muscle_mass: report.muscleMass ?? null,
    visceral_fat_level: report.visceralFatLevel ?? null,
    basal_metabolic_rate: report.basalMetabolicRate ?? null,
    extraction_error: report.extractionError ?? null,
    reviewed_by_dietitian: report.reviewedByDietitian,
    reviewed_by_user_id: report.reviewedByUserId ?? null,
    reviewed_at: report.reviewedAt?.toISOString() ?? null,
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt?.toISOString() ?? null,
  };
}