"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pendingSignups, users } from "@/lib/db/schema";
import { checkPassword, hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth-session";
import { safeNext } from "@/lib/next-path";
import { send } from "@/lib/mail";
import {
  MAX_ATTEMPTS,
  TTL_MS,
  codeEmail,
  codeMatches,
  generateCode,
  hashCode,
  normalizeCode,
} from "@/lib/otp";
import * as throttle from "@/lib/throttle";

const EmailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like an email address.");

export type SignUpState = {
  error?: string;
  field?: "email" | "password" | "confirm" | "code";
  values?: { email: string };
  /** Set once a code is out: the form switches to asking for it. */
  awaitingCode?: boolean;
  /** Set when the code was wrong too often and the signup was discarded. */
  startOver?: boolean;
};

/* ------------------------------------------------------------------ *
 * Step 1 — take the details, send a code, create nothing
 * ------------------------------------------------------------------ */

export async function startSignup(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
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

  /*
   * An address already in use is told so plainly. A signup form cannot
   * avoid leaking that: if it pretended to send a code, the person would be
   * left waiting for mail that can never arrive. The sign-in form, where the
   * tradeoff runs the other way, stays deliberately vague.
   */
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);

  if (existing) {
    return {
      error: "That address already has an account. Sign in instead.",
      field: "email",
      values,
    };
  }

  // Stops one address being used to fire mail at someone repeatedly.
  const gate = throttle.check(`signup:${normalized}`);
  if (!gate.allowed) {
    const minutes = Math.ceil(gate.retryAfterSeconds / 60);
    return {
      error: `Too many codes requested. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      field: "email",
      values,
    };
  }
  throttle.fail(`signup:${normalized}`);

  const code = generateCode();

  /*
   * The password is hashed now, before it is stored anywhere. The pending
   * row is as sensitive as a user row, so it should not be the one place a
   * password sits in the clear for ten minutes.
   */
  await db
    .insert(pendingSignups)
    .values({
      email: normalized,
      passwordHash: await hashPassword(password),
      codeHash: hashCode(code),
      attempts: 0,
      expires: new Date(Date.now() + TTL_MS),
    })
    // Asking again replaces the attempt rather than leaving two live codes.
    .onConflictDoUpdate({
      target: pendingSignups.email,
      set: {
        passwordHash: await hashPassword(password),
        codeHash: hashCode(code),
        attempts: 0,
        expires: new Date(Date.now() + TTL_MS),
      },
    });

  // Expired rows for other people are dead weight; sweep opportunistically
  // rather than running a scheduled job for a table this small.
  await db.delete(pendingSignups).where(lt(pendingSignups.expires, new Date()));

  await send({ to: parsed.data, ...codeEmail(code) });

  return { awaitingCode: true, values: { email: parsed.data } };
}

/* ------------------------------------------------------------------ *
 * Step 2 — check the code, and only then create the account
 * ------------------------------------------------------------------ */

export async function verifySignup(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "");
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const next = safeNext(String(formData.get("next") ?? ""), "/");
  const values = { email };
  const normalized = email.trim().toLowerCase();

  const [pending] = await db
    .select()
    .from(pendingSignups)
    .where(eq(pendingSignups.email, normalized))
    .limit(1);

  const startOver: SignUpState = {
    error: "That signup has expired. Start again.",
    startOver: true,
    values,
  };

  if (!pending) return startOver;
  if (pending.expires.getTime() < Date.now()) {
    await db.delete(pendingSignups).where(eq(pendingSignups.email, normalized));
    return startOver;
  }

  if (!codeMatches(code, pending.codeHash)) {
    const attempts = pending.attempts + 1;

    // Past the cap the signup is discarded, not merely locked: a code that
    // survives unlimited guessing is six digits of nothing.
    if (attempts >= MAX_ATTEMPTS) {
      await db.delete(pendingSignups).where(eq(pendingSignups.email, normalized));
      return {
        error: "Too many wrong codes. Start again to get a new one.",
        startOver: true,
        values,
      };
    }

    await db
      .update(pendingSignups)
      .set({ attempts })
      .where(eq(pendingSignups.email, normalized));

    const left = MAX_ATTEMPTS - attempts;
    return {
      error: `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`,
      field: "code",
      awaitingCode: true,
      values,
    };
  }

  let created;
  try {
    [created] = await db
      .insert(users)
      .values({
        email: email.trim(),
        passwordHash: pending.passwordHash,
        // Proved by the code that just checked out -- which is the whole
        // point of making them wait for it.
        emailVerified: new Date(),
        /*
         * Stamped here rather than when the form was submitted: the
         * account did not exist until now, and the thing worth recording
         * is that the person who owns this address agreed.
         */
        termsAcceptedAt: new Date(),
      })
      .returning({ id: users.id });
  } catch (err) {
    // 23505 = unique_violation on users.email. Two tabs can both verify.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      return {
        error: "That address already has an account. Sign in instead.",
        field: "email",
        startOver: true,
        values,
      };
    }
    throw err;
  }

  await db.delete(pendingSignups).where(eq(pendingSignups.email, normalized));
  throttle.succeed(`signup:${normalized}`);

  await createSession(created.id);
  revalidatePath("/", "layout");
  // No profile yet, so onboarding is the only sensible next step -- it
  // carries the destination onward once a handle exists.
  redirect(`/onboarding?next=${encodeURIComponent(next)}`);
}
