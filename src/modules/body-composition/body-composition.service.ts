import { randomUUID } from "node:crypto";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { extractBodyComposition } from "@/lib/ai/bodyCompositionExtractor";
import { BodyCompositionRepository } from "./body-composition.repository";
import { toSafeBodyCompositionReport } from "./body-composition.mapper";
import { REPORT_FILE_EXTENSIONS, UploadedReportFile } from "./body-composition.file";
import {
  BodyCompositionReportRecord,
  BodyCompositionReviewInput,
  SafeBodyCompositionReport,
} from "./body-composition.types";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

export class BodyCompositionService {
  private async toSafe(record: BodyCompositionReportRecord): Promise<SafeBodyCompositionReport> {
    const fileUrl = await storage.getSignedUrl(record.filePath, SIGNED_URL_TTL_SECONDS);
    return toSafeBodyCompositionReport(record, fileUrl);
  }

  /** POST /admin/patients/{patientId}/body-composition-reports — stores the file, status `pending`. */
  async upload(patientId: string, file: UploadedReportFile): Promise<SafeBodyCompositionReport> {
    const patient = await BodyCompositionRepository.findPatientConsent(patientId);
    if (!patient) throw new NotFoundError("Patient");

    if (!patient.aiProcessingConsentAt) {
      throw new ForbiddenError("The patient has not consented to AI processing of health reports.");
    }

    const extension = REPORT_FILE_EXTENSIONS[file.contentType];
    const filePath = `body-composition/${patientId}/${randomUUID()}.${extension}`;

    await storage.upload(filePath, file.buffer, file.contentType);
    const report = await BodyCompositionRepository.create(patientId, filePath);

    return this.toSafe(report);
  }

  /**
   * Runs after the 202 response. Never throws: the outcome is saved on the report
   * as `success` or `failed`. The extractor masks patient-identifying data before
   * sending the file to the external AI service.
   */
  async runExtraction(reportId: string, file: UploadedReportFile): Promise<void> {
    try {
      const metrics = await extractBodyComposition(file);

      const foundAny = Object.values(metrics).some((value) => value !== null);
      if (!foundAny) {
        await BodyCompositionRepository.markExtractionFailed(reportId, "No body composition metrics found in the report.");
        return;
      }

      await BodyCompositionRepository.markExtractionSuccess(reportId, metrics);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed.";
      await BodyCompositionRepository.markExtractionFailed(reportId, message);
    }
  }

  /** GET /admin/patients/{patientId}/body-composition-reports */
  async listForPatient(patientId: string): Promise<SafeBodyCompositionReport[]> {
    const records = await BodyCompositionRepository.listByPatient(patientId);
    return Promise.all(records.map((record) => this.toSafe(record)));
  }

  /** GET /admin/body-composition-reports/{reportId} */
  async getById(reportId: string): Promise<SafeBodyCompositionReport> {
    const record = await BodyCompositionRepository.findById(reportId);
    if (!record) throw new NotFoundError("Body composition report");
    return this.toSafe(record);
  }

  /** POST /admin/body-composition-reports/{reportId}/review */
  async review(
    reportId: string,
    reviewerUserId: string,
    input: BodyCompositionReviewInput
  ): Promise<SafeBodyCompositionReport> {
    const record = await BodyCompositionRepository.review(reportId, reviewerUserId, input);
    return this.toSafe(record);
  }
}