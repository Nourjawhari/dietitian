import { PatientRepository } from "./patient.repository";
import { PatientSelfUpdateInput, SafePatient } from "./patient.types";
import { toSafePatient } from "./patient.mapper";
import { NotFoundError } from "@/lib/errors";

export class PatientService {
  async getProfile(userId: string): Promise<SafePatient> {
    const patient = await PatientRepository.findByUserId(userId);
    if (!patient) throw new NotFoundError("Patient");
    return toSafePatient(patient);
  }

  async updateProfile(userId: string, input: PatientSelfUpdateInput): Promise<SafePatient> {
    const patient = await PatientRepository.updateByUserId(userId, input);
    return toSafePatient(patient);
  }
}
