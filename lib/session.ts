import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import type { Profile } from "@/lib/db/schema";

export type Viewer = {
  userId: string;
  email: string;
  role: "user" | "editor" | "admin";
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
    profile: row.profile,
  };
}
