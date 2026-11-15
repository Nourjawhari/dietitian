import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { ExtractionStatus } from "@/app/generated/prisma/enums";

export const BodyCompositionReviewSchema = z
  .object({
    body_fat_percentage: z.number().min(0).max(100),
    muscle_mass: z.number().min(0),
    visceral_fat_level: z.number().min(0),
    basal_metabolic_rate: z.number().min(0),
  })
  .transform((data) => ({
    bodyFatPercentage: data.body_fat_percentage,
    muscleMass: data.muscle_mass,
    visceralFatLevel: data.visceral_fat_level,
    basalMetabolicRate: data.basal_metabolic_rate,
  }));

export type BodyCompositionReviewInput = z.infer<typeof BodyCompositionReviewSchema>;

/** What the AI extractor returns; any metric it could not read is null. */
export type BodyCompositionMetrics = {
  bodyFatPercentage: number | null;
  muscleMass: number | null;
  visceralFatLevel: number | null;
  basalMetabolicRate: number | null;
};

/** Raw shape the mapper needs — independent of the repository's exact Prisma select. */
export type BodyCompositionReportRecord = {
  id: string;
  patientId: string;
  filePath: string;
  extractionStatus: ExtractionStatus;
  bodyFatPercentage: Prisma.Decimal | null;
  muscleMass: Prisma.Decimal | null;
  visceralFatLevel: Prisma.Decimal | null;
  basalMetabolicRate: Prisma.Decimal | null;
  extractionError: string | null;
  reviewedByDietitian: boolean;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export type SafeBodyCompositionReport = {
  id: string;
  patientId: string;
  fileUrl: string;
  extractionStatus: ExtractionStatus;
  bodyFatPercentage?: number;
  muscleMass?: number;
  visceralFatLevel?: number;
  basalMetabolicRate?: number;
  extractionError?: string;
  reviewedByDietitian: boolean;
  reviewedByUserId?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
};