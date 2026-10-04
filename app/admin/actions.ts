"use server";

import { revalidatePath } from "next/cache";
import { getModerator, getViewer } from "@/lib/session";
import {
  resolveReport,
  restoreStory,
  restoreTrip,
  setRole,
  takeDownStory,
  takeDownTrip,
} from "@/lib/reports";

export type ModResult = { ok: true } | { ok: false; error: string };

/**
 * Every action here re-checks the role.
 *
 * The /admin page not rendering for a reader is a routing decision; these
 * are public endpoints with guessable names, and the only thing standing
 * between an ordinary account and taking down someone's story is this
 * check.
 */
async function requireModerator() {
  const viewer = await getModerator();
  return viewer;
}

export async function resolveReportAction(
  reportId: string,
  uphold: boolean,
): Promise<ModResult> {
  const viewer = await requireModerator();
  if (!viewer) return { ok: false, error: "Not allowed." };

  const done = await resolveReport({
    reportId,
    moderatorId: viewer.userId,
    uphold,
  });
  if (!done.ok) return { ok: false, error: "That report is already closed." };

  /*
   * Upholding takes content out of circulation, so every page it could be
   * on has to be rebuilt -- the half that is easy to forget, because the
   * queue itself looks right either way. The author's profile and the
   * story's own URL come back from resolveReport, which is the only thing
   * that knows whose they are.
   */
  rebuild(done.paths);

  return { ok: true };
}

export async function restoreStoryAction(storyId: string): Promise<ModResult> {
  const viewer = await requireModerator();
  if (!viewer) return { ok: false, error: "Not allowed." };

  rebuild(await restoreStory(storyId, viewer.userId));
  return { ok: true };
}

/** The always-affected pages, plus whatever the change itself touched. */
function rebuild(paths: string[]) {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/stories");
  for (const path of paths) revalidatePath(path);
}

/**
 * Changing a role.
 *
 * Admin only -- an editor moderates content, which is a different job
 * from deciding who else gets to. Checked here rather than only on the
 * page, because this is the action that can mint another administrator.
 */
export async function setRoleAction(
  userId: string,
  role: "user" | "editor" | "admin",
): Promise<ModResult> {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return { ok: false, error: "Not allowed." };

  if (!["user", "editor", "admin"].includes(role)) {
    return { ok: false, error: "Unknown role." };
  }

  const result = await setRole(userId, role, viewer.userId);
  if (!result.ok) return { ok: false, error: result.error ?? "That didn't work." };

  revalidatePath("/admin/people");
  // The header's Reports link appears and disappears with the role.
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Takes a story down, or puts it back. Moderators, not just admins. */
export async function toggleStoryRemovalAction(
  storyId: string,
  remove: boolean,
): Promise<ModResult> {
  const viewer = await requireModerator();
  if (!viewer) return { ok: false, error: "Not allowed." };

  rebuild(
    remove
      ? await takeDownStory(storyId, viewer.userId)
      : await restoreStory(storyId, viewer.userId),
  );
  revalidatePath("/admin/stories");
  return { ok: true };
}

/**
 * Takes a trip down, or puts it back.
 *
 * Separate from the story action because the two touch different tables
 * and invalidate different pages, and one function branching on a "kind"
 * string would be the same code with a conditional through the middle.
 */
export async function toggleTripRemovalAction(
  collectionId: string,
  remove: boolean,
): Promise<ModResult> {
  const viewer = await requireModerator();
  if (!viewer) return { ok: false, error: "Not allowed." };

  rebuild(
    remove
      ? await takeDownTrip(collectionId, viewer.userId)
      : await restoreTrip(collectionId),
  );
  revalidatePath("/admin/trips");
  return { ok: true };
}
