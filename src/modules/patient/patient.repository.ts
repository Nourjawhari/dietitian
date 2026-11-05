
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import {
  HealthRecordCreateInput,
  HealthRecordRecord,
  HealthRecordUpdateInput,
  PatientCreateInput,
  PatientRecord,
  PatientSelfUpdateInput,
  PatientUpdateInput,
} from "./patient.types";
import { ListQuery } from "@/lib/listQuery";

/** Weight / height², rounded to 2 decimals. */
function computeBmi(heightCm: number, weightKg: number): number {
  const heightInMeters = heightCm / 100;
  return Math.round(
    (weightKg / (heightInMeters * heightInMeters)) * 100
  ) / 100;
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
  user: {
    select: {
      fullName: true,
      email: true,
    },
  },
  healthRecords: {
    orderBy: { recordedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.PatientSelect;

export type PatientWithUser = Prisma.PatientGetPayload<{
  select: typeof PATIENT_SELECT;
}>;

type Transaction = Prisma.TransactionClient;

export class PatientRepository {
  // --------------------------------------------------
  // Shared helpers
  // --------------------------------------------------

  private static toPatientUpdateData(
    data: PatientUpdateInput | PatientSelfUpdateInput
  ): Prisma.PatientUpdateInput {
    return {
      phone: data.phone,
      dateOfBirth:
        data.dateOfBirth === undefined
          ? undefined
          : data.dateOfBirth
            ? new Date(`${data.dateOfBirth}T00:00:00.000Z`)
            : null,
      gender: data.gender,
      note: data.note,
      whatsappOptInAt:
        data.whatsappOptIn === undefined
          ? undefined
          : data.whatsappOptIn
            ? new Date()
            : null,
      aiProcessingConsentAt:
        data.aiProcessingConsent === undefined
          ? undefined
          : data.aiProcessingConsent
            ? new Date()
            : null,
    };
  }

  private static async updateUserDetails(
    userId: string,
    data: {
      fullName?: string;
      email?: string;
    },
    tx: Transaction
  ): Promise<void> {
    const userData: Prisma.UserUpdateInput = {};

    if (data.fullName !== undefined) {
      userData.fullName = data.fullName;
    }

    if (data.email !== undefined) {
      userData.email = data.email;
    }

    if (Object.keys(userData).length === 0) return;

    await tx.user.update({
      where: { id: userId },
      data: userData,
    });
  }

  private static async findActivePatient(
    patientId: string,
    tx: Transaction
  ): Promise<{ id: string; userId: string }> {
    const patient = await tx.patient.findFirst({
      where: {
        id: patientId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!patient) throw new NotFoundError("Patient");

    return patient;
  }

  private static async createHealthRecord(
    patientId: string,
    data: HealthRecordCreateInput,
    tx: Transaction
  ): Promise<HealthRecordRecord> {
    const bmi = computeBmi(data.height, data.weight);

    return tx.patientHealthRecord.create({
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

  // --------------------------------------------------
  // Patient queries
  // --------------------------------------------------

  static async findByUserId(
    userId: string
  ): Promise<PatientWithUser | null> {
    return prisma.patient.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
      select: PATIENT_SELECT,
    });
  }

  static async findById(
    patientId: string
  ): Promise<{ id: string } | null> {
    return prisma.patient.findFirst({
      where: {
        id: patientId,
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  static async listPatients(
    query: ListQuery
  ): Promise<{ records: PatientRecord[]; total: number }> {
    const { search, page, pageSize } = query;

    const where: Prisma.PatientWhereInput = {
      deletedAt: null,
      ...(search && {
        user: {
          OR: [
            {
              fullName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        },
      }),
    };

    const [records, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
          healthRecords: {
            orderBy: { recordedAt: "desc" },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.patient.count({ where }),
    ]);

    return { records, total };
  }

  // --------------------------------------------------
  // Patient creation
  // --------------------------------------------------

  static async createPatient(
    userId: string,
    data: PatientCreateInput,
    tx?: Transaction
  ): Promise<PatientWithUser> {
    const db = tx ?? prisma;

    await db.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        email: data.email,
      },
    });

    return db.patient.create({
      data: {
        userId,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth
          ? new Date(`${data.dateOfBirth}T00:00:00.000Z`)
          : undefined,
        gender: data.gender,
        note: data.note,
        whatsappOptInAt:
          data.whatsappOptIn === undefined
            ? undefined
            : data.whatsappOptIn
              ? new Date()
              : null,
        aiProcessingConsentAt:
          data.aiProcessingConsent === undefined
            ? undefined
            : data.aiProcessingConsent
              ? new Date()
              : null,
      },
      select: PATIENT_SELECT,
    });
  }

  static async createFullPatient(
    userId: string,
    data: PatientCreateInput
  ): Promise<PatientWithUser> {
    return prisma.$transaction(async (tx) => {
      const patient = await this.createPatient(userId, data, tx);

      const healthRecord = await this.createHealthRecord(
        patient.id,
        data.healthRecord,
        tx
      );

      return {
        ...patient,
        healthRecords: [healthRecord],
      };
    });
  }

  // --------------------------------------------------
  // Patient updates
  // --------------------------------------------------

  /** Admin updates a patient using the patient's ID. */
  static async updatePatient(
    patientId: string,
    data: PatientUpdateInput
  ): Promise<PatientWithUser> {
    return prisma.$transaction(async (tx) => {
      const patient = await this.findActivePatient(patientId, tx);

      await this.updateUserDetails(
        patient.userId,
        {
          fullName: data.fullName,
          email: data.email,
        },
        tx
      );

      return tx.patient.update({
        where: { id: patient.id },
        data: this.toPatientUpdateData(data),
        select: PATIENT_SELECT,
      });
    });
  }

  /** Patient updates their own profile using their authenticated user ID. */
  static async updateFullPatient(
    userId: string,
    data: PatientSelfUpdateInput
  ): Promise<PatientWithUser> {
    return prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!patient) throw new NotFoundError("Patient");

      await this.updateUserDetails(
        userId,
        { fullName: data.fullName },
        tx
      );

      return tx.patient.update({
        where: { id: patient.id },
        data: this.toPatientUpdateData(data),
        select: PATIENT_SELECT,
      });
    });
  }

  static async updateByUserId(
    userId: string,
    data: PatientSelfUpdateInput
  ): Promise<PatientWithUser> {
    return this.updateFullPatient(userId, data);
  }

  static async deletePatient(patientId: string): Promise<void> {
    await prisma.patient.update({
      where: { id: patientId },
      data: { deletedAt: new Date() },
    });
  }

  // --------------------------------------------------
  // Health records
  // --------------------------------------------------

  static async addHealthRecord(
    userId: string,
    data: HealthRecordCreateInput
  ): Promise<HealthRecordRecord> {
    return prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!patient) throw new NotFoundError("Patient");

      return this.createHealthRecord(patient.id, data, tx);
    });
  }

  static async listHealthRecords(
    patientId: string
  ): Promise<HealthRecordRecord[]> {
    const patient = await this.findById(patientId);

    if (!patient) throw new NotFoundError("Patient");

    return prisma.patientHealthRecord.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" },
    });
  }

  static async addHealthRecordForPatient(
    patientId: string,
    data: HealthRecordCreateInput
  ): Promise<HealthRecordRecord> {
    return prisma.$transaction(async (tx) => {
      const patient = await this.findActivePatient(patientId, tx);

      return this.createHealthRecord(patient.id, data, tx);
    });
  }

  static async updateHealthRecord(
    patientId: string,
    recordId: string,
    data: HealthRecordUpdateInput
  ): Promise<HealthRecordRecord> {
    return prisma.$transaction(async (tx) => {
      const patient = await this.findActivePatient(patientId, tx);

      const existing = await tx.patientHealthRecord.findFirst({
        where: {
          id: recordId,
          patientId: patient.id,
        },
      });

      if (!existing) throw new NotFoundError("Health record");

      const height = data.height ?? Number(existing.height);
      const weight = data.weight ?? Number(existing.weight);
      const bmi = computeBmi(height, weight);

      return tx.patientHealthRecord.update({
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
    });
  }
}