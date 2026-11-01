import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { HealthRecordCreateInput, HealthRecordRecord, HealthRecordUpdateInput, PatientSelfUpdateInput } from "./patient.types";

/** weight / (height in m)², rounded to 2 decimals. */
function computeBmi(heightCm: number, weightKg: number): number {
  const heightInMeters = heightCm / 100;
  return Math.round((weightKg / (heightInMeters * heightInMeters)) * 100) / 100;
}

const PATIENT_SELECT = {
  id: true,
  userId: true,
  phone: true,
  dateOfBirth: true,
  gender: true,
  note: true,
  whatsappOptInAt: true,
  aiProcessingConsentAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { fullName: true, email: true } },
  healthRecords: { orderBy: { recordedAt: "desc" }, take: 1 },
} satisfies Prisma.PatientSelect;

export type PatientWithUser = Prisma.PatientGetPayload<{ select: typeof PATIENT_SELECT }>;

export class PatientRepository {
  /** Active (non-deleted) patient profile by the owning user's id, with full_name/email joined in. */
  static async findByUserId(userId: string): Promise<PatientWithUser | null> {
    return prisma.patient.findFirst({
      where: { userId, deletedAt: null },
      select: PATIENT_SELECT,
    });
  }

  static async updateByUserId(userId: string, data: PatientSelfUpdateInput): Promise<PatientWithUser> {
    const existing = await prisma.patient.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    if (!existing) throw new NotFoundError("Patient");

    return prisma.$transaction(async (tx) => {
      if (data.fullName !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { fullName: data.fullName } });
      }
      return tx.patient.update({
        where: { id: existing.id },
        data: {
          phone: data.phone,
          dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00.000Z`) : undefined,
          gender: data.gender,
          note: data.note,
          whatsappOptInAt: data.whatsappOptIn === undefined ? undefined : data.whatsappOptIn ? new Date() : null,
          aiProcessingConsentAt: data.aiProcessingConsent === undefined ? undefined : data.aiProcessingConsent ? new Date() : null,
        },
        select: PATIENT_SELECT,
      });
    });
  }

  static async addHealthRecord(userId: string, data: HealthRecordCreateInput): Promise<HealthRecordRecord> {
    const patient = await prisma.patient.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    if (!patient) throw new NotFoundError("Patient");
    return PatientRepository.createHealthRecord(patient.id, data);
  }

  /** Active (non-deleted) patient by their own id — used by admin routes, which address patients directly. */
  static async findById(patientId: string): Promise<{ id: string } | null> {
    return prisma.patient.findFirst({ where: { id: patientId, deletedAt: null }, select: { id: true } });
  }

  /** All health records for a patient, newest first. Does not 404 on an empty list — only on a missing patient. */
  static async listHealthRecords(patientId: string): Promise<HealthRecordRecord[]> {
    const patient = await PatientRepository.findById(patientId);
    if (!patient) throw new NotFoundError("Patient");
    return prisma.patientHealthRecord.findMany({ where: { patientId }, orderBy: { recordedAt: "desc" } });
  }

  static async addHealthRecordForPatient(patientId: string, data: HealthRecordCreateInput): Promise<HealthRecordRecord> {
    const patient = await PatientRepository.findById(patientId);
    if (!patient) throw new NotFoundError("Patient");
    return PatientRepository.createHealthRecord(patient.id, data);
  }

  static async updateHealthRecord(patientId: string, recordId: string, data: HealthRecordUpdateInput): Promise<HealthRecordRecord> {
    const existing = await prisma.patientHealthRecord.findFirst({ where: { id: recordId, patientId } });
    if (!existing) throw new NotFoundError("Health record");

    const height = data.height ?? Number(existing.height);
    const weight = data.weight ?? Number(existing.weight);
    const bmi = computeBmi(height, weight);

    return prisma.patientHealthRecord.update({
      where: { id: recordId },
      data: {
        recordedAt: data.recordedAt,
        height: data.height,
        weight: data.weight,
        bmi,
        isObese: bmi >= 30,
        chronicConditions: data.chronicConditions,
        allergies: data.allergies,
        dietitianGoal: data.dietitianGoal,
      },
    });
  }

  private static async createHealthRecord(patientId: string, data: HealthRecordCreateInput): Promise<HealthRecordRecord> {
    const bmi = computeBmi(data.height, data.weight);

    return prisma.patientHealthRecord.create({
      data: {
        patientId,
        recordedAt: data.recordedAt,
        height: data.height,
        weight: data.weight,
        bmi,
        isObese: bmi >= 30,
        chronicConditions: data.chronicConditions,
        allergies: data.allergies,
        dietitianGoal: data.dietitianGoal,
      },
    });
  }
}
