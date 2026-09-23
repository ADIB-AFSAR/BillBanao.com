import "server-only";
import { ZodError } from "zod";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function actionError(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/**
 * Wraps an action body so unexpected errors never leak raw database or
 * stack-trace details to the client - only a safe, generic message does,
 * while the real error is still logged server-side for debugging.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return actionSuccess(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "form";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return actionError("Please fix the highlighted fields.", fieldErrors);
    }
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") {
        return actionError("You need to sign in to do that.");
      }
      if (err.message === "SUBSCRIPTION_INACTIVE") {
        return actionError(
          "This account's access is currently paused. Please contact the platform owner to resume."
        );
      }
      if (err.message === "PERMISSION_DENIED") {
        return actionError("Your account doesn't have permission to do that. Ask the business owner to grant it.");
      }
      if (err.message === "FORBIDDEN") {
        return actionError("You don't have access to that resource.");
      }
      // Postgres unique-constraint violation surfaced by Prisma
      if ("code" in err && (err as { code?: string }).code === "P2002") {
        return actionError("That value is already in use. Choose a different one.");
      }
      console.error(err);
      return actionError(err.message.length < 120 ? err.message : "Something went wrong. Please try again.");
    }
    console.error(err);
    return actionError("Something went wrong. Please try again.");
  }
}
