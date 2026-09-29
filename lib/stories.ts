import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { slugify, uniqueSlug } from "@/lib/slug";

/** Resolve a title into a slug that's free within this author's namespace. */
export async function slugForTitle(
  authorId: string,
  title: string,
  exceptStoryId: string,
): Promise<string> {
  const rows = await db
    .select({ slug: stories.slug })
    .from(stories)
    .where(and(eq(stories.authorId, authorId), ne(stories.id, exceptStoryId)));

  return uniqueSlug(slugify(title), new Set(rows.map((r) => r.slug)));
}
