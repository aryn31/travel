"use server";

import { z } from "zod";
import { signIn } from "@/auth";

const EmailSchema = z.string().trim().min(1, "Enter your email address.").email(
  "That doesn't look like an email address.",
);

// React 19 resets an uncontrolled form once its action resolves, so anything
// the user typed is gone on re-render. Echoing the submitted values back into
// state and feeding them to defaultValue is what survives that reset.
export type SignInState = { error?: string; values?: { email: string } };

export async function sendMagicLink(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values: { email } };
  }

  // signIn throws a redirect on success, so it must stay outside any try/catch.
  await signIn("terminal", { email: parsed.data, redirectTo: "/onboarding" });
  return {};
}
