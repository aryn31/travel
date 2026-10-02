"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { normalizeHandle } from "@/lib/handles";
import { LIMITS, normalizeWebsite } from "@/lib/profile";
import { checkPassword, hashPassword, verifyPassword } from "@/lib/password";
import { revokeOtherSessions } from "@/lib/auth-session";
import { isSafeKey, remove as removeFromStorage } from "@/lib/storage";
import * as throttle from "@/lib/throttle";

export type ProfileValues = {
  handle: string;
  displayName: string;
  bio: string;
  website: string;
  homeCountry: string;
};

export type ProfileField = keyof ProfileValues;

// React 19 resets an uncontrolled form once its action resolves, so a
// rejected handle would otherwise cost the user everything else they typed.
export type ProfileState = {
  error?: string;
  field?: ProfileField;
  values?: ProfileValues;
  saved?: boolean;
  /** Set when the handle changed, so the form can point at the new URL. */
  movedTo?: string;
};

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");

  const values: ProfileValues = {
    handle: String(formData.get("handle") ?? ""),
    displayName: String(formData.get("displayName") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    website: String(formData.get("website") ?? "").trim(),
    homeCountry: String(formData.get("homeCountry") ?? "").trim(),
  };

  const fail = (field: ProfileField, error: string): ProfileState => ({
    error,
    field,
    values,
  });

  const checked = normalizeHandle(values.handle);
  if (!checked.ok) return fail("handle", checked.error);

  if (values.displayName.length < 1) return fail("displayName", "Tell us what to call you.");
  if (values.displayName.length > LIMITS.displayName)
    return fail("displayName", `${LIMITS.displayName} characters max.`);
  if (values.bio.length > LIMITS.bio) return fail("bio", `${LIMITS.bio} characters max.`);
  if (values.homeCountry.length > LIMITS.homeCountry)
    return fail("homeCountry", `${LIMITS.homeCountry} characters max.`);

  const site = normalizeWebsite(values.website);
  if (!site.ok) return fail("website", site.error);

  const previous = viewer.profile.handle;
  const moved = checked.handle !== previous.toLowerCase();

  try {
    await db
      .update(profiles)
      .set({
        handle: checked.handle,
        displayName: values.displayName,
        bio: values.bio || null,
        website: site.url || null,
        homeCountry: values.homeCountry || null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, viewer.userId));
  } catch (err) {
    // 23505 = unique_violation on profiles_handle_lower_idx. Two people can
    // both pass a pre-check at once, so the index is the real arbiter.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      return fail("handle", "That handle is already taken.");
    }
    throw err;
  }

  // The header and every byline read the profile, and the handle is the
  // first segment of each story URL -- so the whole tree is stale, not just
  // this page.
  revalidatePath("/", "layout");

  return {
    saved: true,
    values: { ...values, handle: checked.handle, website: site.url },
    movedTo: moved ? checked.handle : undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Password
 * ------------------------------------------------------------------ */

export type PasswordState = {
  error?: string;
  field?: "current" | "next" | "confirm";
  saved?: boolean;
};

/**
 * Sets a password, or changes an existing one. An account created by magic
 * link has no password to confirm, so the current-password step only applies
 * once one exists.
 */
export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (viewer.hasPassword) {
    const key = `settings:${viewer.userId}`;
    const gate = throttle.check(key);
    if (!gate.allowed) {
      const minutes = Math.ceil(gate.retryAfterSeconds / 60);
      return {
        error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        field: "current",
      };
    }

    // Re-read the hash here rather than carrying it on the viewer: it should
    // not be in a shape that anything else can accidentally return.
    const [row] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, viewer.userId))
      .limit(1);

    if (!(await verifyPassword(current, row?.passwordHash ?? null))) {
      throttle.fail(key);
      return { error: "That is not your current password.", field: "current" };
    }
    throttle.succeed(key);
  }

  const strength = checkPassword(next);
  if (!strength.ok) return { error: strength.error, field: "next" };
  if (next !== confirm) {
    return { error: "The two passwords do not match.", field: "confirm" };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(users.id, viewer.userId));

  // Anyone holding a session from the old password loses it. The session in
  // this browser survives, so changing a password does not sign you out of
  // the tab you changed it in.
  await revokeOtherSessions(viewer.userId);

  return { saved: true };
}

/* ------------------------------------------------------------------ *
 * Profile photo
 * ------------------------------------------------------------------ */

export type AvatarState = { ok: true; avatarKey: string | null } | { ok: false; error: string };

/**
 * Points the profile at an already-uploaded key, or clears it.
 *
 * The bytes are in place before this runs -- the browser PUT them straight
 * to storage through a signed URL. All that is left is to say which key is
 * mine, and the ownership check is the key's own prefix: every key is minted
 * as `<userId>/<uuid>.<ext>`, so a key that does not start with this user's
 * id was not issued to them.
 */
export async function setAvatar(avatarKey: string | null): Promise<AvatarState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");

  if (avatarKey !== null) {
    if (!isSafeKey(avatarKey) || !avatarKey.startsWith(`${viewer.userId}/`)) {
      return { ok: false, error: "That upload isn't yours." };
    }
  }

  const previous = viewer.profile.avatarKey;

  await db
    .update(profiles)
    .set({ avatarKey, updatedAt: new Date() })
    .where(eq(profiles.userId, viewer.userId));

  /*
   * Delete the file the profile just stopped pointing at. Nothing else can
   * reference it -- avatar keys never enter a story body or a media row --
   * so a replaced photo left behind is storage nobody will ever reclaim.
   * Failure here is not worth failing the save for.
   */
  if (previous && previous !== avatarKey) {
    try {
      await removeFromStorage(previous);
    } catch {
      /* the row is already updated; an orphaned file is the lesser problem */
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, avatarKey };
}
