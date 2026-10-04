import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import type { Profile } from "@/lib/db/schema";

export type Viewer = {
  userId: string;
  email: string;
  role: "user" | "editor" | "admin";
  /** Whether a password is set. The hash itself never leaves this module. */
  hasPassword: boolean;
  profile: Profile | null;
};

/** The signed-in user plus their profile, or null when signed out. */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [row] = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return null;

  return {
    userId: row.user.id,
    email: row.user.email ?? "",
    role: row.user.role,
    hasPassword: Boolean(row.user.passwordHash),
    profile: row.profile,
  };
}

/**
 * The viewer, if they are allowed to moderate.
 *
 * `users.role` has existed since the first migration with nothing reading
 * it. This is what makes it mean something. Editors and admins are both
 * moderators; the distinction is kept for later -- an editor curating the
 * home page is a different job from an admin removing an account.
 */
export async function getModerator(): Promise<Viewer | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  return viewer.role === "admin" || viewer.role === "editor" ? viewer : null;
}

export function isModerator(viewer: Viewer | null): boolean {
  return viewer?.role === "admin" || viewer?.role === "editor";
}

