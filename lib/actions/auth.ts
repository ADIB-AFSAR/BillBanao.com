"use server";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { loginSchema, registerSchema } from "@/schemas/common";
import { runAction } from "./action-result";

export async function registerAction(formData: unknown) {
  return runAction(async () => {
    const input = registerSchema.parse(formData);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new Error("An account with that email already exists.");
    }

    const passwordHash = await hashPassword(input.password);

    const { user } = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: input.businessName,
          ownerName: input.ownerName,
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

    await createSession({
      userId: user.id,
      businessId: user.businessId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return { redirectTo: "/business/setup" };
  });
}

export async function loginAction(formData: unknown) {
  return runAction(async () => {
    const input = loginSchema.parse(formData);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new Error("Incorrect email or password.");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new Error("Incorrect email or password.");
    }

    await createSession({
      userId: user.id,
      businessId: user.businessId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return { redirectTo: "/dashboard" };
  });
}

export async function logoutAction() {
  return runAction(async () => {
    await destroySession();
    return { redirectTo: "/login" };
  });
}

export async function getCurrentSessionAction() {
  return runAction(async () => {
    return getSession();
  });
}