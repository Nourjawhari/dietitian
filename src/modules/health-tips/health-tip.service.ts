import { NotFoundError } from "@/lib/errors";
import { ListQuery } from "@/lib/listQuery";
import { HealthTipRepository } from "./health-tip.repository";
import { toSafeHealthTip } from "./health-tip.mapper";
import {
  HealthTipCreateInput,
  HealthTipFilter,
  HealthTipUpdateInput,
  SafeHealthTip,
} from "./health-tip.types";

export class HealthTipService {
  // Public

  /** GET /health-tips — published tips only. */
  async listPublished(language: HealthTipFilter["language"], query: ListQuery) {
    const { records, total } = await HealthTipRepository.listPublished(language, query);
    return { records: records.map(toSafeHealthTip), pagination: query.toPagination(total) };
  }

  // Admin

  /** GET /admin/health-tips — all tips, filterable by language and is_published. */
  async listAll(filter: HealthTipFilter, query: ListQuery) {
    const { records, total } = await HealthTipRepository.listAll(filter, query);
    return { records: records.map(toSafeHealthTip), pagination: query.toPagination(total) };
  }

  async getById(tipId: string): Promise<SafeHealthTip> {
    const tip = await HealthTipRepository.findById(tipId);
    if (!tip) throw new NotFoundError("Health tip");
    return toSafeHealthTip(tip);
  }

  /** POST /admin/health-tips */
  async create(input: HealthTipCreateInput): Promise<SafeHealthTip> {
    const tip = await HealthTipRepository.create(input);
    return toSafeHealthTip(tip);
  }

  /** PUT /admin/health-tips/{tipId} */
  async update(tipId: string, input: HealthTipUpdateInput): Promise<SafeHealthTip> {
    const tip = await HealthTipRepository.update(tipId, input);
    return toSafeHealthTip(tip);
  }

  /** DELETE /admin/health-tips/{tipId} */
  async delete(tipId: string): Promise<void> {
    await HealthTipRepository.delete(tipId);
  }
}