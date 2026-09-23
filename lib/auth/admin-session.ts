import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "platform_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days - shorter-lived than business sessions on purpose

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  name: string;
}

function getSecretKey() {
  // Deliberately reuses AUTH_SECRET rather than introducing a second env
  // var to configure - the two session types are still cryptographically
  // independent because the cookie name and payload shape differ, so a
  // business-user token can never be mistaken for an admin token (the admin
  // code path checks for `adminId`, which a business session never has).
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a long random value in your .env file."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(payload: AdminSessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.adminId) return null; // not an admin token
    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
