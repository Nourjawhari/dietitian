import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { ListQuery } from "@/lib/listQuery";
import {
  HealthTipCreateInput,
  HealthTipFilter,
  HealthTipRecord,
  HealthTipUpdateInput,
} from "./health-tip.types";

const HEALTH_TIP_SELECT = {
  id: true,
  sectionId: true,
  title: true,
  content: true,
  language: true,
  isPublished: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HealthTipSelect;

type Transaction = Prisma.TransactionClient;

export class HealthTipRepository {
  // --------------------------------------------------
  // Shared helpers
  // --------------------------------------------------

  /** A tip may only be linked to a section that exists. */
  private static async assertSectionExists(
    sectionId: string,
    tx: Transaction
  ): Promise<void> {
    const section = await tx.pageSection.findUnique({
      where: { id: sectionId },
      select: { id: true },
    });

    if (!section) throw new BadRequestError("Page section does not exist.");
  }

  private static async findExisting(
    tipId: string,
    tx: Transaction
  ): Promise<{ id: string; isPublished: boolean }> {
    const tip = await tx.healthTip.findUnique({
      where: { id: tipId },
      select: { id: true, isPublished: true },
    });

    if (!tip) throw new NotFoundError("Health tip");

    return tip;
  }

  private static async list(
    where: Prisma.HealthTipWhereInput,
    orderBy: Prisma.HealthTipOrderByWithRelationInput[],
    query: ListQuery
  ): Promise<{ records: HealthTipRecord[]; total: number }> {
    const { page, pageSize } = query;

    const [records, total] = await prisma.$transaction([
      prisma.healthTip.findMany({
        where,
        orderBy,
        select: HEALTH_TIP_SELECT,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.healthTip.count({ where }),
    ]);

    return { records, total };
  }

  // --------------------------------------------------
  // Queries
  // --------------------------------------------------

  /** Public: published tips only, newest publication first. */
  static async listPublished(
    language: HealthTipFilter["language"],
    query: ListQuery
  ): Promise<{ records: HealthTipRecord[]; total: number }> {
    return this.list(
      {
        isPublished: true,
        ...(language && { language }),
      },
      [{ publishedAt: "desc" }, { createdAt: "desc" }],
      query
    );
  }

  /** Admin: every tip, optionally filtered by language and publish state. */
  static async listAll(
    filter: HealthTipFilter,
    query: ListQuery
  ): Promise<{ records: HealthTipRecord[]; total: number }> {
    return this.list(
      {
        ...(filter.language && { language: filter.language }),
        ...(filter.isPublished !== undefined && {
          isPublished: filter.isPublished,
        }),
      },
      [{ createdAt: "desc" }],
      query
    );
  }

  static async findById(tipId: string): Promise<HealthTipRecord | null> {
    return prisma.healthTip.findUnique({
      where: { id: tipId },
      select: HEALTH_TIP_SELECT,
    });
  }

  // --------------------------------------------------
  // Mutations
  // --------------------------------------------------

  static async create(data: HealthTipCreateInput): Promise<HealthTipRecord> {
    return prisma.$transaction(async (tx) => {
      if (data.sectionId) {
        await this.assertSectionExists(data.sectionId, tx);
      }

      return tx.healthTip.create({
        data: {
          title: data.title,
          content: data.content,
          language: data.language,
          sectionId: data.sectionId,
          isPublished: data.isPublished,
          publishedAt: data.isPublished ? new Date() : null,
        },
        select: HEALTH_TIP_SELECT,
      });
    });
  }

  /**
   * `publishedAt` is set when a tip goes from unpublished to published
   * and cleared when it is unpublished; otherwise it is left unchanged.
   */
  static async update(
    tipId: string,
    data: HealthTipUpdateInput
  ): Promise<HealthTipRecord> {
    return prisma.$transaction(async (tx) => {
      const existing = await this.findExisting(tipId, tx);

      if (data.sectionId) {
        await this.assertSectionExists(data.sectionId, tx);
      }

      let publishedAt: Date | null | undefined;
      if (data.isPublished === true && !existing.isPublished) {
        publishedAt = new Date();
      } else if (data.isPublished === false) {
        publishedAt = null;
      }

      return tx.healthTip.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          content: data.content,
          language: data.language,
          sectionId: data.sectionId,
          isPublished: data.isPublished,
          publishedAt,
        },
        select: HEALTH_TIP_SELECT,
      });
    });
  }

  static async delete(tipId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = await this.findExisting(tipId, tx);
      await tx.healthTip.delete({ where: { id: existing.id } });
    });
  }
}