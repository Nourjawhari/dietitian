import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { ListQuery } from "@/lib/listQuery";
import {
  ContactSubmissionCreateInput,
  ContactSubmissionFilter,
  ContactSubmissionRecord,
  ContactSubmissionStatusUpdateInput,
} from "./contact.types";

const CONTACT_SUBMISSION_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  subject: true,
  message: true,
  status: true,
  submittedAt: true,
  updatedAt: true,
} satisfies Prisma.ContactSubmissionSelect;

export class ContactRepository {
  // --------------------------------------------------
  // Queries
  // --------------------------------------------------

  static async listAll(
    filter: ContactSubmissionFilter,
    query: ListQuery
  ): Promise<{ records: ContactSubmissionRecord[]; total: number }> {
    const { page, pageSize } = query;

    const where: Prisma.ContactSubmissionWhereInput = {
      ...(filter.status && { status: filter.status }),
    };

    const [records, total] = await prisma.$transaction([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        select: CONTACT_SUBMISSION_SELECT,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    return { records, total };
  }

  static async findById(submissionId: string): Promise<ContactSubmissionRecord | null> {
    return prisma.contactSubmission.findUnique({
      where: { id: submissionId },
      select: CONTACT_SUBMISSION_SELECT,
    });
  }

  // --------------------------------------------------
  // Mutations
  // --------------------------------------------------

  /** New submissions always start as `unread`; the client cannot set the status. */
  static async create(data: ContactSubmissionCreateInput): Promise<ContactSubmissionRecord> {
    return prisma.contactSubmission.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        status: "unread",
      },
      select: CONTACT_SUBMISSION_SELECT,
    });
  }

  static async updateStatus(
    submissionId: string,
    data: ContactSubmissionStatusUpdateInput
  ): Promise<ContactSubmissionRecord> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.contactSubmission.findUnique({
        where: { id: submissionId },
        select: { id: true },
      });

      if (!existing) throw new NotFoundError("Contact submission");

      return tx.contactSubmission.update({
        where: { id: existing.id },
        data: { status: data.status },
        select: CONTACT_SUBMISSION_SELECT,
      });
    });
  }
}