import { SafeUser } from "@/modules/user";
import { SafeHealthRecord, SafePatient } from "@/modules/patient";

/** camelCase domain shape -> snake_case wire shape, for every endpoint that returns a user. */
export function serializeUser(user: SafeUser) {
  return {
    id: user.id,
    full_name: user.fullName,
    email: user.email,
    phone_number: user.phoneNumber ?? null,
    role: user.role,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

export function serializePatient(patient: SafePatient) {
  return {
    id: patient.id,
    user_id: patient.userId,
    full_name: patient.fullName,
    email: patient.email,
    phone: patient.phone ?? null,
    date_of_birth: patient.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    gender: patient.gender ?? null,
    note: patient.note ?? null,
    whatsapp_opt_in: patient.whatsappOptIn,
    ai_processing_consent: patient.aiProcessingConsent,
    latest_health_record: patient.latestHealthRecord ? serializeHealthRecord(patient.latestHealthRecord) : null,
    created_at: patient.createdAt.toISOString(),
    updated_at: patient.updatedAt.toISOString(),
  };
}

export function serializeHealthRecord(record: SafeHealthRecord) {
  return {
    id: record.id,
    patient_id: record.patientId,
    recorded_at: record.recordedAt.toISOString(),
    height: record.height,
    weight: record.weight,
    bmi: record.bmi,
    is_obese: record.isObese,
    chronic_conditions: record.chronicConditions,
    allergies: record.allergies,
    dietitian_goal: record.dietitianGoal ?? null,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
}
