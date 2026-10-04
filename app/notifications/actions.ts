"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/session";
import { markAllRead } from "@/lib/notifications";

/** Clears the unread dot. Everything at once -- see markAllRead. */
export async function markAllReadAction(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;

  await markAllRead(viewer.userId);
  revalidatePath("/notifications");
  // The dot lives in the header, which is on every page.
  revalidatePath("/", "layout");
}
