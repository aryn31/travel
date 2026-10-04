"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/session";
import { toggleSave, type SaveTarget } from "@/lib/saves";

export type SaveResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string };

/**
 * Saving, or unsaving.
 *
 * Signed-in only, because a reading list belongs to an account. The target
 * is shape-checked rather than trusted -- it arrives from a button in the
 * browser, and anything else would reach the database as a bad id.
 */
export async function toggleSaveAction(
  target: SaveTarget,
): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to save things." };

  if (
    (target?.kind !== "story" && target?.kind !== "collection") ||
    typeof target.id !== "string" ||
    target.id.length === 0
  ) {
    return { ok: false, error: "Nothing to save." };
  }

  const state = await toggleSave(target, viewer.userId);

  // The shelf changed; the page the button is on did not.
  revalidatePath("/saved");
  return { ok: true, saved: state.saved };
}
