import "server-only";
import nodemailer from "nodemailer";

/**
 * The seam between the app and however mail actually leaves the building,
 * following the same shape as lib/storage.ts (PLAN.md 4.5).
 *
 * `terminal` is the default on purpose: development should not need
 * credentials, should not spend anyone's daily send quota, and should work
 * on a plane. Switching to real mail is one env var.
 */
export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function driver(): "terminal" | "smtp" {
  return process.env.MAIL_DRIVER === "smtp" ? "smtp" : "terminal";
}

export function mailFrom(): string {
  return process.env.MAIL_FROM ?? "Wendfolk <dev@localhost>";
}

/**
 * Prints the message instead of sending it, with any link pulled out on its
 * own line -- the whole point of reading this in a terminal is to click the
 * link, and hunting for it inside an HTML body is miserable.
 */
function printToTerminal(mail: Mail) {
  const line = "─".repeat(72);
  const links = [...mail.text.matchAll(/https?:\/\/\S+/g)].map((m) => m[0]);

  console.log(
    `\n${line}\n  MAIL to ${mail.to}\n  ${mail.subject}\n` +
      (links.length > 0 ? `\n  ${links.join("\n  ")}\n` : "") +
      `\n${mail.text.trim()}\n${line}\n`,
  );
}

/* Cached across hot reloads: Next re-evaluates modules on every edit, and a
   fresh connection pool per reload eventually exhausts the SMTP server's
   concurrent-connection limit. Same reasoning as lib/db/index.ts. */
const globalForMail = globalThis as unknown as {
  transport?: nodemailer.Transporter;
};

function transport(): nodemailer.Transporter {
  if (globalForMail.transport) return globalForMail.transport;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error(
      "MAIL_DRIVER=smtp needs SMTP_HOST, SMTP_USER and SMTP_PASS",
    );
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const created = nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
    secure: port === 465,
    auth: { user, pass },
  });

  if (process.env.NODE_ENV !== "production") globalForMail.transport = created;
  return created;
}

/**
 * Sends, or prints. Never throws into the caller's happy path: a password
 * reset that fails to send must not reveal itself by erroring differently
 * from one that succeeded, and nothing here is worth failing a request for.
 * Failures are logged and reported by the return value.
 */
export async function send(mail: Mail): Promise<{ ok: boolean }> {
  if (driver() === "terminal") {
    printToTerminal(mail);
    return { ok: true };
  }

  try {
    await transport().sendMail({ from: mailFrom(), ...mail });
    return { ok: true };
  } catch (err) {
    console.error(
      `[mail] could not send "${mail.subject}" to ${mail.to}:`,
      err instanceof Error ? err.message : err,
    );
    return { ok: false };
  }
}
