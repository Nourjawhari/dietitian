import { Prisma, Role } from "@/app/generated/prisma/client";
import { ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { RegisterInput } from "./auth.types";

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  passwordHash: true,
  role: true,
  preferredLanguage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserWithPasswordHash = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

export class AuthRepository {
  /** Creates the User row and its Patient row together, atomically (Prisma nested write). */
  static async registerPatient(data: Omit<RegisterInput, "password">, passwordHash: string): Promise<UserWithPasswordHash> {
    try {
      return await prisma.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          passwordHash,
          phoneNumber: data.phoneNumber,
          preferredLanguage: data.preferredLanguage,
          role: Role.patient,
          patient: {
            create: {
              phone: data.phoneNumber,
              whatsappOptInAt: data.whatsappOptIn ? new Date() : null,
            },
          },
        },
        select: USER_SELECT,
      });
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictError((err.meta?.target as string[] | undefined) ?? [], "A user with that email already exists.");
      }
      throw err;
    }
  }

  /** Active (non-deleted) user by email, including the password hash — login only, never exposed outward. */
  static async findActiveByEmail(email: string): Promise<UserWithPasswordHash | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: USER_SELECT,
    });
  }

  /** Active (non-deleted) user by id — used to resolve the caller behind a bearer token. */
  static async findActiveById(id: string): Promise<UserWithPasswordHash | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });
  }

  static async isRevoked(jti: string): Promise<boolean> {
    return (await prisma.revokedToken.findUnique({ where: { jti } })) !== null;
  }

  /** Denylists a token's jti until it would have expired anyway. Idempotent: ignores an already-revoked jti. */
  static async revokeToken(jti: string, userId: string, expiresAt: Date): Promise<void> {
    try {
      await prisma.revokedToken.create({ data: { jti, userId, expiresAt } });
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
      throw err;
    }
  }
}
