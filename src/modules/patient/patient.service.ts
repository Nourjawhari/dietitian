import { PatientRepository } from "./patient.repository";
import {
  HealthRecordCreateInput,
  HealthRecordUpdateInput,
  PatientSelfUpdateInput,
  SafeHealthRecord,
  SafePatient,
  PatientCreateInput,
  PatientUpdateInput
} from "./patient.types";
import { toSafeHealthRecord, toSafePatient } from "./patient.mapper";
import { NotFoundError } from "@/lib/errors";
import { ListQuery } from "@/lib/listQuery";

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

  async getLatestHealthRecord(userId: string): Promise<SafeHealthRecord> {
    const patient = await PatientRepository.findByUserId(userId);
    if (!patient) throw new NotFoundError("Patient");

    const latest = patient.healthRecords[0];
    if (!latest) throw new NotFoundError("Health record");

    return toSafeHealthRecord(latest);
  }

  async addHealthRecord(userId: string, input: HealthRecordCreateInput): Promise<SafeHealthRecord> {
    const record = await PatientRepository.addHealthRecord(userId, input);
    return toSafeHealthRecord(record);
  }

  /** Admin: all of a patient's health records, newest first. An empty list is valid, not a 404. */
  async listHealthRecordsForPatient(patientId: string): Promise<SafeHealthRecord[]> {
    const records = await PatientRepository.listHealthRecords(patientId);
    return records.map(toSafeHealthRecord);
  }

  async addHealthRecordForPatient(patientId: string, input: HealthRecordCreateInput): Promise<SafeHealthRecord> {
    const record = await PatientRepository.addHealthRecordForPatient(patientId, input);
    return toSafeHealthRecord(record);
  }

  async updateHealthRecord(patientId: string, recordId: string, input: HealthRecordUpdateInput): Promise<SafeHealthRecord> {
    const record = await PatientRepository.updateHealthRecord(patientId, recordId, input);
    return toSafeHealthRecord(record);
  }

  async listPatients(query:ListQuery) {
    const { records, total } = await PatientRepository.listPatients(query);
    return { records, pagination: query.toPagination(total) };
  }

  async createFullPatient(userId: string, data: PatientCreateInput): Promise<SafePatient> {
    const patient = await PatientRepository.createFullPatient(userId, data);
    return toSafePatient(patient);
  }

  async updateFullPatient(userId: string, input: PatientUpdateInput): Promise<SafePatient> {
    const patient = await PatientRepository.updateFullPatient(userId, input);
    return toSafePatient(patient);
  }
}
