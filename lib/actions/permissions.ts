"use server";

import { requireSession } from "@/lib/auth/session";
import { getMyPermissions } from "@/lib/auth/permissions";
import { runAction } from "./action-result";

export async function getMyPermissionsAction() {
  return runAction(async () => {
    const session = await requireSession();
    const permissions = await getMyPermissions(session);
    return { role: session.role, ...permissions };
  });
}
