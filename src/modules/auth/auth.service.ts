import bcrypt from "bcryptjs";
import { AuthRepository } from "./auth.repository";
import { LoginInput, RegisterInput } from "./auth.types";
import { signAccessToken, verifyAccessToken, ACCESS_TOKEN_EXPIRES_IN } from "./auth.token";
import { SafeUser, toSafeUser } from "@/modules/user";
import { UnauthorizedError } from "@/lib/errors";

export type AuthSession = {
  accessToken: string;
  expiresIn: number;
  user: SafeUser;
};

export class AuthService {
  async register(input: RegisterInput): Promise<SafeUser> {
    const { password, ...rest } = input;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await AuthRepository.registerPatient(rest, passwordHash);
    return toSafeUser(user);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const { email, password } = input;
    const user = await AuthRepository.findActiveByEmail(email);
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const accessToken = await signAccessToken(user.id);
    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      user: toSafeUser(user),
    };
  }

  async logout(accessToken: string): Promise<void> {
    let payload;
    try {
      payload = await verifyAccessToken(accessToken);
    } catch {
      throw new UnauthorizedError();
    }
    await AuthRepository.revokeToken(payload.jti, payload.sub, new Date(payload.exp * 1000));
  }
}
