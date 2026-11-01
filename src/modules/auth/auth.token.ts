import { randomUUID } from "crypto";
import { jwtVerify, SignJWT } from "jose";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is not set.");
const encodedSecret = new TextEncoder().encode(secret);

export const ACCESS_TOKEN_EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN) || 86400; // seconds

export type AccessTokenPayload = {
  sub: string;
  jti: string;
  exp: number;
};

/** Signs a short-lived access token. The jti lets a logout flow revoke it via RevokedToken. */
export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES_IN)
    .sign(encodedSecret);
}

/** Verifies an access token's signature and expiry. Throws on any invalid/expired/malformed token. */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, encodedSecret, { algorithms: ["HS256"] });
  if (typeof payload.sub !== "string" || typeof payload.jti !== "string" || typeof payload.exp !== "number") {
    throw new Error("Malformed access token payload.");
  }
  return { sub: payload.sub, jti: payload.jti, exp: payload.exp };
}
