import { HealthRecordRecord, PatientRecord, SafeHealthRecord, SafePatient } from "./patient.types";

/** Strips internal fields off a Patient row and flattens in full_name/email from its User. */
export function toSafePatient(patient: PatientRecord): SafePatient {
  const latest = patient.healthRecords[0];
  return {
    id: patient.id,
    userId: patient.userId,
    fullName: patient.user.fullName,
    email: patient.user.email,
    phone: patient.phone ?? undefined,
    dateOfBirth: patient.dateOfBirth ?? undefined,
    gender: patient.gender ?? undefined,
    note: patient.note ?? undefined,
    whatsappOptIn: patient.whatsappOptInAt !== null,
    aiProcessingConsent: patient.aiProcessingConsentAt !== null,
    latestHealthRecord: latest ? toSafeHealthRecord(latest) : undefined,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

export function toSafeHealthRecord(record: HealthRecordRecord): SafeHealthRecord {
  return {
    id: record.id,
    patientId: record.patientId,
    recordedAt: record.recordedAt,
    height: Number(record.height),
    weight: Number(record.weight),
    bmi: Number(record.bmi),
    isObese: record.isObese,
    chronicConditions: record.chronicConditions as string[],
    allergies: record.allergies as string[],
    dietitianGoal: record.dietitianGoal ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
