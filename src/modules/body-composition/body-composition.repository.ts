import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  BodyCompositionMetrics,
  BodyCompositionReportRecord,
  BodyCompositionReviewInput,
} from "./body-composition.types";

const REPORT_SELECT = {
  id: true,
  patientId: true,
  filePath: true,
  extractionStatus: true,
  bodyFatPercentage: true,
  muscleMass: true,
  visceralFatLevel: true,
  basalMetabolicRate: true,
  extractionError: true,
  reviewedByDietitian: true,
  reviewedByUserId: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BodyCompositionReportSelect;

export class BodyCompositionRepository {
  // --------------------------------------------------
  // Queries
  // --------------------------------------------------

  /** Active patient plus their AI-processing consent, or null if not found. */
  static async findPatientConsent(
    patientId: string
  ): Promise<{ id: string; aiProcessingConsentAt: Date | null } | null> {
    return prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true, aiProcessingConsentAt: true },
    });
  }

  static async listByPatient(patientId: string): Promise<BodyCompositionReportRecord[]> {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true },
    });

    if (!patient) throw new NotFoundError("Patient");

    return prisma.bodyCompositionReport.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      select: REPORT_SELECT,
    });
  }

  static async findById(reportId: string): Promise<BodyCompositionReportRecord | null> {
    return prisma.bodyCompositionReport.findUnique({
      where: { id: reportId },
      select: REPORT_SELECT,
    });
  }

  // --------------------------------------------------
  // Mutations
  // --------------------------------------------------

  static async create(patientId: string, filePath: string): Promise<BodyCompositionReportRecord> {
    return prisma.bodyCompositionReport.create({
      data: {
        patientId,
        filePath,
        extractionStatus: "pending",
        reviewedByDietitian: false,
      },
      select: REPORT_SELECT,
    });
  }

  /** Only a still-pending report is updated, so a late AI result never overwrites a review. */
  static async markExtractionSuccess(reportId: string, metrics: BodyCompositionMetrics): Promise<void> {
    await prisma.bodyCompositionReport.updateMany({
      where: { id: reportId, extractionStatus: "pending" },
      data: {
        extractionStatus: "success",
        bodyFatPercentage: metrics.bodyFatPercentage,
        muscleMass: metrics.muscleMass,
        visceralFatLevel: metrics.visceralFatLevel,
        basalMetabolicRate: metrics.basalMetabolicRate,
        extractionError: null,
      },
    });
  }

  static async markExtractionFailed(reportId: string, message: string): Promise<void> {
    await prisma.bodyCompositionReport.updateMany({
      where: { id: reportId, extractionStatus: "pending" },
      data: {
        extractionStatus: "failed",
        extractionError: message.slice(0, 1000),
      },
    });
  }

  /** Allowed after `success` or `failed` (manual entry); rejected while `pending` or once `reviewed`. */
  static async review(
    reportId: string,
    reviewerUserId: string,
    data: BodyCompositionReviewInput
  ): Promise<BodyCompositionReportRecord> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.bodyCompositionReport.findUnique({
        where: { id: reportId },
        select: { id: true, extractionStatus: true },
      });

      if (!existing) throw new NotFoundError("Body composition report");

      if (existing.extractionStatus === "pending") {
        throw new ConflictError("Extraction is still pending.");
      }

      if (existing.extractionStatus === "reviewed") {
        throw new ConflictError("This report has already been reviewed.");
      }

      return tx.bodyCompositionReport.update({
        where: { id: existing.id },
        data: {
          bodyFatPercentage: data.bodyFatPercentage,
          muscleMass: data.muscleMass,
          visceralFatLevel: data.visceralFatLevel,
          basalMetabolicRate: data.basalMetabolicRate,
          extractionStatus: "reviewed",
          reviewedByDietitian: true,
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
        },
        select: REPORT_SELECT,
      });
    });
  }
}