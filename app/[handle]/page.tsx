import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";

/**
 * Matches the first path segment, so it only handles /@handle -- anything
 * without the @ is a 404. Static routes (/signin, /onboarding) take
 * precedence over this dynamic segment, which is why the namespace in
 * lib/handles.ts has to stay reserved.
 */
export default async function ProfilePage({
  params,
}: PageProps<"/[handle]">) {
  const { handle: segment } = await params;
  const raw = decodeURIComponent(segment);
  if (!raw.startsWith("@")) notFound();

  const handle = raw.slice(1).toLowerCase();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(sql`lower(${profiles.handle}) = ${handle}`)
    .limit(1);

  if (!profile) notFound();

  const viewer = await getViewer();
  const isMe = viewer?.userId === profile.userId;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        {profile.displayName}
      </h1>
      <p className="mt-1 opacity-60">@{profile.handle}</p>
      {profile.bio && <p className="mt-4 leading-relaxed">{profile.bio}</p>}

      <hr className="my-10 border-black/10 dark:border-white/15" />

      <p className="text-sm opacity-60">
        {isMe
          ? "No stories yet — the editor lands in Week 2."
          : "No stories yet."}
      </p>
    </main>
  );
}
