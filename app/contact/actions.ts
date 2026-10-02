"use server";

import { z } from "zod";
import { getViewer } from "@/lib/session";
import { send, mailFrom } from "@/lib/mail";
import * as throttle from "@/lib/throttle";

const Schema = z.object({
  name: z.string().trim().min(1, "Tell us who you are.").max(80, "80 characters max."),
  email: z
    .string()
    .trim()
    .min(1, "We need an address to reply to.")
    .email("That doesn't look like an email address."),
  message: z
    .string()
    .trim()
    .min(10, "A little more than that.")
    .max(4000, "4,000 characters max — email us directly for anything longer."),
});

export type ContactState = {
  error?: string;
  field?: "name" | "email" | "message";
  values?: { name: string; email: string; message: string };
  sent?: boolean;
};

/** Where it lands. Falls back to the account the mail is sent from. */
function inbox(): string {
  return process.env.CONTACT_TO ?? process.env.SMTP_USER ?? mailFrom();
}

export async function sendMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  /*
   * Honeypot. A field positioned off-screen and left empty by anyone who
   * cannot see it; most form spam fills every input it finds. Answering
   * "sent" rather than rejecting means a bot gets no signal to adapt.
   */
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { sent: true };
  }

  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = Schema.safeParse(values);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: first.message,
      field: first.path[0] as ContactState["field"],
      values,
    };
  }

  // A public form that sends mail is an abuse vector; cap it per address.
  const key = `contact:${parsed.data.email.toLowerCase()}`;
  const gate = throttle.check(key);
  if (!gate.allowed) {
    const minutes = Math.ceil(gate.retryAfterSeconds / 60);
    return {
      error: `You've sent a few already. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      values,
    };
  }
  throttle.fail(key);

  // Recorded, not trusted: it says whether the sender was signed in when
  // they wrote, which is worth knowing before replying.
  const viewer = await getViewer();
  const who = viewer?.profile
    ? `signed in as @${viewer.profile.handle} (${viewer.email})`
    : "not signed in";

  const body = [
    parsed.data.message,
    "",
    "—",
    `From: ${parsed.data.name} <${parsed.data.email}>`,
    `Account: ${who}`,
  ].join("\n");

  await send({
    to: inbox(),
    // Subject carries the name so a full inbox is still scannable.
    subject: `Wendfolk — message from ${parsed.data.name}`,
    text: body,
    html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.6;color:#191310">
        <p style="white-space:pre-wrap">${escapeHtml(parsed.data.message)}</p>
        <hr style="border:0;border-top:1px solid #ddd;margin:1.5rem 0">
        <p style="color:#6a5c50;font-size:0.875rem">
          From ${escapeHtml(parsed.data.name)}
          &lt;${escapeHtml(parsed.data.email)}&gt;<br>
          Account: ${escapeHtml(who)}
        </p>
      </div>`,
    // Reply goes to the visitor, not to the site's own account.
    replyTo: `${parsed.data.name} <${parsed.data.email}>`,
  });

  /*
   * Reports success whether or not the send worked. lib/mail logs failures
   * rather than throwing, and a visitor can do nothing useful with "our
   * mail server is down" except retype their message.
   */
  return { sent: true, values: parsed.data };
}

/** The message is interpolated into HTML, so the five that matter are escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
