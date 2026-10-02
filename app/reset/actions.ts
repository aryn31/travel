"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import { checkPassword, hashPassword } from "@/lib/password";
import { checkToken, spendToken } from "@/lib/password-reset";
import { createSession, revokeOtherSessions } from "@/lib/auth-session";

export type ResetState = {
  error?: string;
  field?: "next" | "confirm" | "token";
};

export async function resetPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Re-checked here, not just when the page rendered: the link could have
  // been used in another tab, or expired while the form sat open.
  const check = await checkToken(token);
  if (!check.ok) {
    return {
      error:
        check.reason === "expired"
          ? "That link has expired. Ask for a new one."
          : "That link is not valid. Ask for a new one.",
      field: "token",
    };
  }

  const strength = checkPassword(next);
  if (!strength.ok) return { error: strength.error, field: "next" };
  if (next !== confirm) {
    return { error: "The two passwords do not match.", field: "confirm" };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(users.id, check.userId));

  // Burn the link before anything else can use it.
  await spendToken(token);

  /*
   * Whoever knew the old password keeps a live session otherwise -- and a
   * reset is very often *because* someone else got in. Every existing
   * session goes, then a fresh one is created for the person holding the
   * link, so they end up signed in rather than bounced to a login form.
   */
  await revokeOtherSessions(check.userId);
  await createSession(check.userId);

  const [profile] = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, check.userId))
    .limit(1);

  revalidatePath("/", "layout");
  redirect(profile ? "/settings" : "/onboarding");
}
