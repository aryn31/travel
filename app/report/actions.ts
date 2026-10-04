"use server";

import { getViewer } from "@/lib/session";
import { fileReport, type Target } from "@/lib/reports";
import { REPORT_REASONS, MAX_DETAIL, type ReportReason } from "@/lib/report-rules";
import * as throttle from "@/lib/throttle";

export type ReportResult = { ok: true } | { ok: false; error: string };

/**
 * Filing a report.
 *
 * Signed-in only, and not for anonymous reasons: a report costs a
 * moderator's attention, and an account is the cheapest thing that makes
 * someone answerable for spending it.
 */
export async function submitReport(
  target: Target,
  formData: FormData,
): Promise<ReportResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to report something." };

  // The target comes from the client, so its shape is checked rather than
  // trusted -- anything else would reach the database as a bad id.
  if (
    (target?.kind !== "story" && target?.kind !== "comment") ||
    typeof target.id !== "string" ||
    target.id.length === 0
  ) {
    return { ok: false, error: "Nothing to report." };
  }

  const reason = String(formData.get("reason") ?? "") as ReportReason;
  if (!REPORT_REASONS.includes(reason)) {
    return { ok: false, error: "Pick a reason." };
  }

  const detail = String(formData.get("detail") ?? "").trim().slice(0, MAX_DETAIL);

  /*
   * Capped per account rather than per target. The unique index already
   * stops the same thing being reported twice; this is the other shape of
   * abuse -- one account reporting everything.
   */
  const key = `report:${viewer.userId}`;
  const gate = throttle.check(key);
  if (!gate.allowed) {
    const minutes = Math.ceil(gate.retryAfterSeconds / 60);
    return {
      ok: false,
      error: `You've sent a few already. Try again in ${minutes} minute${
        minutes === 1 ? "" : "s"
      }.`,
    };
  }

  const result = await fileReport({
    target,
    reporterId: viewer.userId,
    reason,
    detail: detail || null,
  });

  if (!result.ok) return result;
  if (!result.duplicate) throttle.fail(key);

  return { ok: true };
}
