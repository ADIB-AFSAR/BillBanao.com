"use server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createAdminSession, destroyAdminSession } from "@/lib/auth/admin-session";
import { adminLoginSchema } from "@/schemas/admin";
import { runAction } from "./action-result";

export async function loginAdminAction(formData: unknown) {
  return runAction(async () => {
    const input = adminLoginSchema.parse(formData);

    const admin = await prisma.platformAdmin.findUnique({ where: { email: input.email } });
    if (!admin) {
      throw new Error("Incorrect email or password.");
    }
    const valid = await verifyPassword(input.password, admin.passwordHash);
    if (!valid) {
      throw new Error("Incorrect email or password.");
    }

    await createAdminSession({ adminId: admin.id, email: admin.email, name: admin.name });
    return { redirectTo: "/admin" };
  });
}

export async function logoutAdminAction() {
  return runAction(async () => {
    await destroyAdminSession();
    return { redirectTo: "/admin/login" };
  });
}
