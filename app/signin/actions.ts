"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth-session";
import { safeNext } from "@/lib/next-path";
import * as throttle from "@/lib/throttle";

const EmailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like an email address.");

// React 19 resets an uncontrolled form once its action resolves, so anything
// the user typed is gone on re-render. Echoing the submitted values back into
// state and feeding them to defaultValue is what survives that reset.
export type SignInState = {
  error?: string;
  field?: "email" | "password";
  values?: { email: string };
  /** Set when the address exists but has no password yet. */
  useLink?: boolean;
};

export async function sendMagicLink(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""), "/onboarding");
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, field: "email", values: { email } };
  }

  // signIn throws a redirect on success, so it must stay outside any try/catch.
  await signIn("terminal", {
    email: parsed.data,
    redirectTo: `/onboarding?next=${encodeURIComponent(next)}`,
  });
  return {};
}

export async function signInWithPassword(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""), "/");
  const values = { email };

  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, field: "email", values };
  }
  if (!password) {
    return { error: "Enter your password.", field: "password", values };
  }

  const key = parsed.data.toLowerCase();
  const gate = throttle.check(key);
  if (!gate.allowed) {
    const minutes = Math.ceil(gate.retryAfterSeconds / 60);
    return {
      error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or sign in with a link instead.`,
      values,
      useLink: true,
    };
  }

  const [row] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(sql`lower(${users.email}) = ${key}`)
    .limit(1);

  /*
   * One message for "no such account" and for "wrong password". Saying
   * which is which turns the form into a way to find out who has an account
   * here, and the accounts are people's names.
   */
  const wrong: SignInState = {
    error: "That email and password do not match.",
    field: "password",
    values,
  };

  if (!row) {
    throttle.fail(key);
    return wrong;
  }

  // An account created by magic link has no password to check. This is the
  // one case worth naming: the alternative is telling someone their correct
  // password is wrong.
  if (!row.passwordHash) {
    return {
      error: "This account has no password yet. Sign in with a link, then set one in your profile.",
      values,
      useLink: true,
    };
  }

  if (!(await verifyPassword(password, row.passwordHash))) {
    throttle.fail(key);
    return wrong;
  }

  throttle.succeed(key);
  await createSession(row.id);

  const [profile] = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, row.id))
    .limit(1);

  // The header is in the root layout, which App Router reuses across
  // navigations -- without this it keeps rendering the signed-out nav.
  revalidatePath("/", "layout");
  // Someone sent here by the read wall goes back to the story they wanted;
  // a new account still has to pick a handle first.
  redirect(profile ? next : `/onboarding?next=${encodeURIComponent(next)}`);
}
