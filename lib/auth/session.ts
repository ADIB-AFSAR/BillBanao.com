import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { isBusinessAccessActive } from "@/lib/subscription";

const COOKIE_NAME = "billing_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  businessId: string;
  email: string;
  name: string;
  role: "OWNER" | "STAFF";
  /** Row id in UserSession - lets logout release this session's slot against Plan.maxConcurrentLogins. */
  sessionId?: string;
}

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a long random value in your .env file."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
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

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      userId: payload.userId as string,
      businessId: payload.businessId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as "OWNER" | "STAFF",
      sessionId: payload.sessionId as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Throws if there is no valid session. Use at the top of every server
 * action / route handler that touches business data so a signed-out
 * request can never reach the database layer.
 *
 * This also re-checks User.isActive against the database on every call
 * (not just at login). A JWT cookie is otherwise stateless, so without this
 * an owner deactivating a staff member would only take effect once that
 * staff member's 30-day cookie happened to expire - clearly not what
 * "deactivate" should mean. The extra query is the deliberate cost of that
 * guarantee.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { isActive: true } });
  if (!user || !user.isActive) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Same as requireSession(), but also blocks the request if the business's
 * subscription is PAST_DUE/SUSPENDED (or its trial has expired). Use this
 * instead of requireSession() for anything that *creates or changes* data
 * (billing, products, categories, customers) - not for read-only actions,
 * so a paused business can still see its own data.
 *
 * This exists because the page-level gate in app/(app)/layout.tsx only
 * re-runs on navigation: a tab that was already open before the business
 * was suspended would otherwise keep working indefinitely. Every mutating
 * server action is the real enforcement boundary; the layout gate is just
 * the friendly UI for it.
 */
export async function requireActiveSession(): Promise<SessionPayload> {
  const session = await requireSession();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: session.businessId },
    select: { subscriptionStatus: true, trialEndsAt: true },
  });
  if (!isBusinessAccessActive(business)) {
    throw new Error("SUBSCRIPTION_INACTIVE");
  }
  return session;
}

/** For actions only the business owner may perform (team management, business settings). */
export async function requireOwnerSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "OWNER") {
    throw new Error("PERMISSION_DENIED");
  }
  return session;
}
