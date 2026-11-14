import { NotFoundError } from "@/lib/errors";
import { ListQuery } from "@/lib/listQuery";
import { ContactRepository } from "./contact.repository";
import { toSafeContactSubmission } from "./contact.mapper";
import {
  ContactSubmissionCreateInput,
  ContactSubmissionFilter,
  ContactSubmissionStatusUpdateInput,
  SafeContactSubmission,
} from "./contact.types";

export class ContactService {
  // Public

  /** POST /contact */
  async submit(input: ContactSubmissionCreateInput): Promise<SafeContactSubmission> {
    const submission = await ContactRepository.create(input);
    return toSafeContactSubmission(submission);
  }

  // Admin

  /** GET /admin/contact-submissions */
  async listAll(filter: ContactSubmissionFilter, query: ListQuery) {
    const { records, total } = await ContactRepository.listAll(filter, query);
    return { records: records.map(toSafeContactSubmission), pagination: query.toPagination(total) };
  }

  /** GET /admin/contact-submissions/{submissionId} */
  async getById(submissionId: string): Promise<SafeContactSubmission> {
    const submission = await ContactRepository.findById(submissionId);
    if (!submission) throw new NotFoundError("Contact submission");
    return toSafeContactSubmission(submission);
  }

  /** PUT /admin/contact-submissions/{submissionId} */
  async updateStatus(
    submissionId: string,
    input: ContactSubmissionStatusUpdateInput
  ): Promise<SafeContactSubmission> {
    const submission = await ContactRepository.updateStatus(submissionId, input);
    return toSafeContactSubmission(submission);
  }
}