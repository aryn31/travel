"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { normalizeHandle } from "@/lib/handles";
import { safeNext } from "@/lib/next-path";

// React 19 resets an uncontrolled form once its action resolves. Echo the
// submitted values back so a rejected handle doesn't cost the user everything
// else they typed.
export type OnboardingState = {
  error?: string;
  field?: "handle" | "displayName";
  values?: { handle: string; displayName: string };
};

export async function createProfile(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (viewer.profile) redirect(`/@${viewer.profile.handle}`);

  const next = safeNext(String(formData.get("next") ?? ""), "");
  const rawHandle = String(formData.get("handle") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const values = { handle: rawHandle, displayName };

  const checked = normalizeHandle(rawHandle);
  if (!checked.ok) return { error: checked.error, field: "handle", values };

  if (displayName.length < 1) {
    return { error: "Tell us what to call you.", field: "displayName", values };
  }
  if (displayName.length > 50) {
    return { error: "50 characters max.", field: "displayName", values };
  }

  try {
    await db.insert(profiles).values({
      userId: viewer.userId,
      handle: checked.handle,
      displayName,
    });
  } catch (err) {
    // 23505 = unique_violation. Racing signups can both pass a pre-check, so
    // the database index is the real arbiter of who gets the handle.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      return { error: "That handle is already taken.", field: "handle", values };
    }
    throw err;
  }

  // The header lives in the root layout, which App Router reuses across
  // navigations -- without this it keeps showing "Finish setup" until a
  // full reload.
  revalidatePath("/", "layout");
  // Back to whatever sent them here -- usually a story behind the wall.
  redirect(next || `/@${checked.handle}`);
}
