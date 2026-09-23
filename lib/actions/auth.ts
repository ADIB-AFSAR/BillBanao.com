"use server";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { loginSchema, registerSchema } from "@/schemas/common";
import { runAction } from "./action-result";

const SESSION_TTL_DAYS = 30; // must match SESSION_DURATION_SECONDS in lib/auth/session.ts

/**
 * Creates the UserSession ledger row used to enforce Plan.maxConcurrentLogins,
 * then signs the cookie with that row's id embedded so logout can release it.
 * Shared by both register and login so every way of getting a cookie is
 * counted consistently.
 */
async function issueSession(user: { id: string; businessId: string; email: string; name: string; role: "OWNER" | "STAFF" }) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const sessionRow = await prisma.userSession.create({
    data: { userId: user.id, businessId: user.businessId, expiresAt },
  });

  await createSession({
    userId: user.id,
    businessId: user.businessId,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionId: sessionRow.id,
  });
}

export async function registerAction(formData: unknown) {
  return runAction(async () => {
    const input = registerSchema.parse(formData);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new Error("An account with that email already exists.");
    }

    const passwordHash = await hashPassword(input.password);

    const platformSettings = await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + platformSettings.trialDurationDays);

    const { user } = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: input.businessName,
          ownerName: input.ownerName,
          trialEndsAt,
          settings: {
            create: {},
          },
        },
      });

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.ownerName,
          role: "OWNER",
          businessId: business.id,
        },
      });

      return { business, user };
    }, { timeout: 10_000 });

    await issueSession(user);

    return { redirectTo: "/business/setup" };
  });
}

export async function loginAction(formData: unknown) {
  return runAction(async () => {
    const input = loginSchema.parse(formData);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { business: { include: { plan: true } } },
    });
    if (!user) {
      throw new Error("Incorrect email or password.");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new Error("Incorrect email or password.");
    }

    if (!user.isActive) {
      throw new Error("This account has been deactivated. Contact your business owner.");
    }

    const limit = user.business.plan?.maxConcurrentLogins;
    if (limit != null) {
      const activeCount = await prisma.userSession.count({
        where: {
          businessId: user.businessId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (activeCount >= limit) {
        throw new Error(
          `This plan allows up to ${limit} logged-in session${limit === 1 ? "" : "s"} at a time, and that limit is currently reached. Sign out elsewhere first, or upgrade the plan.`
        );
      }
    }

    await issueSession(user);

    return { redirectTo: "/dashboard" };
  });
}

export async function logoutAction() {
  return runAction(async () => {
    const session = await getSession();
    if (session?.sessionId) {
      // Best-effort release of this session's slot; if the row is already
      // gone or this fails for any reason, signing out must still succeed.
      await prisma.userSession.update({
        where: { id: session.sessionId },
        data: { revokedAt: new Date() },
      }).catch(() => undefined);
    }
    await destroySession();
    return { redirectTo: "/login" };
  });
}

export async function getCurrentSessionAction() {
  return runAction(async () => {
    return getSession();
  });
}
