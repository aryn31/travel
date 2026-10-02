"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { checkPassword, hashPassword } from "@/lib/password";
import { checkToken, spendToken } from "@/lib/password-reset";
import { revokeAllSessions } from "@/lib/auth-session";

export type ResetState = {
  error?: string;
  field?: "next" | "confirm" | "token";
  /** Set once the password is changed; the form is replaced by a notice. */
  done?: boolean;
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
   * Every session goes, including any the person doing this already had.
   * A reset is very often *because* someone else got in, and following an
   * emailed link proves only that you can read the mailbox -- so nobody
   * stays signed in on the strength of a session that predates the reset.
   *
   * Deliberately not signing them in here either: typing the new password
   * once on the sign-in page is what turns "I set a password" into "I know
   * my password", and it costs one form.
   */
  await revokeAllSessions(check.userId);

  /*
   * Deliberately no revalidatePath here.
   *
   * app/reset/page.tsx checks the token when it renders, and the token has
   * just been spent -- so revalidating re-runs that check, the page swaps to
   * its "link isn't valid" branch, and the form unmounts taking the success
   * message with it. Someone who had just succeeded was told they had
   * failed.
   *
   * Nothing needs revalidating anyway: every session is gone, and the next
   * thing this person does is navigate to /signin, which renders fresh.
   */
  return { done: true };
}
