import { SafeUser } from "@/modules/user";

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
