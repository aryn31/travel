"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { checkPassword, hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth-session";
import { safeNext } from "@/lib/next-path";

const EmailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like an email address.");

export type SignUpState = {
  error?: string;
  field?: "email" | "password" | "confirm";
  values?: { email: string };
};

export async function createAccount(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""), "/");
  const values = { email };

  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, field: "email", values };
  }

  const strength = checkPassword(password);
  if (!strength.ok) return { error: strength.error, field: "password", values };

  if (password !== confirm) {
    return { error: "The two passwords do not match.", field: "confirm", values };
  }

  const normalized = parsed.data.toLowerCase();

  const [existing] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);

  /*
   * An address already in use is told so plainly. That does leak whether an
   * account exists -- but a signup form cannot avoid it: if it pretended to
   * succeed, the person would be left with a password that does not work
   * and no way to understand why. The sign-in form, where the tradeoff runs
   * the other way, stays deliberately vague.
   */
  if (existing) {
    return {
      error: existing.passwordHash
        ? "That address already has an account. Sign in instead."
        : "That address already has an account — sign in with a link and set a password from your profile.",
      field: "email",
      values,
    };
  }

  const passwordHash = await hashPassword(password);

  let created;
  try {
    [created] = await db
      .insert(users)
      .values({
        email: parsed.data,
        passwordHash,
        // Nothing has proved this address is reachable. It is recorded as
        // unverified on purpose: when real mail goes out (PLAN.md 10.4),
        // this is the flag that gates it.
        emailVerified: null,
      })
      .returning({ id: users.id });
  } catch (err) {
    // 23505 = unique_violation on users.email. Two signups can race past the
    // check above, so the constraint is the real arbiter.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      return { error: "That address already has an account. Sign in instead.", field: "email", values };
    }
    throw err;
  }

  await createSession(created.id);
  revalidatePath("/", "layout");
  // No profile yet, so onboarding is the only sensible next step -- it
  // carries the destination onward once a handle exists.
  redirect(`/onboarding?next=${encodeURIComponent(next)}`);
}
