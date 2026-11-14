import { ContactSubmissionRecord, SafeContactSubmission } from "./contact.types";

export function toSafeContactSubmission(record: ContactSubmissionRecord): SafeContactSubmission {
  return {
    id: record.id,
    fullName: record.fullName,
    email: record.email,
    phone: record.phone ?? undefined,
    subject: record.subject ?? undefined,
    message: record.message,
    status: record.status,
    submittedAt: record.submittedAt,
    updatedAt: record.updatedAt ?? undefined,
  };
}

export function toContactSubmissionResponse(submission: SafeContactSubmission) {
  return {
    id: submission.id,
    full_name: submission.fullName,
    email: submission.email,
    phone: submission.phone ?? null,
    subject: submission.subject ?? null,
    message: submission.message,
    status: submission.status,
    submitted_at: submission.submittedAt.toISOString(),
    updated_at: submission.updatedAt?.toISOString() ?? null,
  };
}