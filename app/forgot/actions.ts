"use server";

import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { issueToken } from "@/lib/password-reset";
import { send } from "@/lib/mail";
import * as throttle from "@/lib/throttle";

const EmailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like an email address.");

export type ForgotState = { error?: string; sent?: boolean; values?: { email: string } };

function resetEmail(link: string) {
  return {
    subject: "Reset your Wendfolk password",
    text: [
      "Someone asked to reset the password on your Wendfolk account.",
      "",
      "Open this link to choose a new one. It works once and expires in an hour:",
      link,
      "",
      "If this wasn't you, ignore this email — nothing has changed, and your",
      "current password still works.",
    ].join("\n"),
    html: `
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:32rem;line-height:1.6;color:#191310">
        <p>Someone asked to reset the password on your Wendfolk account.</p>
        <p style="margin:1.75rem 0">
          <a href="${link}" style="background:#191310;color:#fcf7ec;padding:0.75rem 1.5rem;border-radius:999px;text-decoration:none;font-weight:500">
            Choose a new password
          </a>
        </p>
        <p style="color:#6a5c50;font-size:0.875rem">
          The link works once and expires in an hour.
        </p>
        <p style="color:#6a5c50;font-size:0.875rem">
          If this wasn't you, ignore this email — nothing has changed, and your
          current password still works.
        </p>
      </div>`,
  };
}

export async function requestReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "");
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values: { email } };
  }

  const key = `reset:${parsed.data.toLowerCase()}`;
  const gate = throttle.check(key);
  /*
   * A rate-limited request still reports success. Saying "too many
   * attempts" for one address and "sent" for another turns this form into
   * a way to find out which addresses have accounts -- the exact thing the
   * identical-response rule below is protecting.
   */
  if (gate.allowed) {
    throttle.fail(key);

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(sql`lower(${users.email}) = ${parsed.data.toLowerCase()}`)
      .limit(1);

    if (user?.email) {
      const token = await issueToken(user.id);
      const base = process.env.AUTH_URL ?? "http://localhost:3000";
      const link = `${base}/reset?token=${encodeURIComponent(token)}`;
      // Deliberately not awaited for its result: whether sending worked
      // must not change what this function returns.
      await send({ to: user.email, ...resetEmail(link) });
    }
  }

  /*
   * One answer for every address, real or not. An honest "no account with
   * that email" is a membership oracle for anyone who wants to know
   * whether a given person writes here, and the accounts are people's
   * names.
   */
  return { sent: true, values: { email } };
}
