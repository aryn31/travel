/**
 * The vocabulary of a report, shared by the form and the queue.
 *
 * No `"use server"` and no database import, so the report dialog can label
 * its own options -- the same split as publish-rules and visibility.
 */
export const REPORT_REASONS = ["spam", "abuse", "copyright", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REASON_LABEL: Record<ReportReason, string> = {
  spam: "Spam or advertising",
  abuse: "Abusive or hateful",
  copyright: "Not their work",
  other: "Something else",
};

/** Shown under the chosen reason, so a reporter knows what they are claiming. */
export const REASON_HINT: Record<ReportReason, string> = {
  spam: "Written to sell something or to carry links, not to be read.",
  abuse: "Attacks a person or a group, or is there to harass someone.",
  copyright: "Copied from somewhere else and passed off as their own.",
  other: "Tell us what is wrong in a sentence.",
};

export const MAX_DETAIL = 500;
