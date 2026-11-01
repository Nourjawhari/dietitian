import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { PatientSelfUpdateInput } from "./patient.types";

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
}
