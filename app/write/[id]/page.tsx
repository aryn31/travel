import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { docToText } from "@/lib/story-doc";
import { Editor } from "./Editor";

export const metadata = { title: "Write" };

export default async function WritePage({ params }: PageProps<"/write/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");

  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, id), eq(stories.authorId, viewer.userId)))
    .limit(1);

  if (!story) notFound();

  return (
    <Editor
      storyId={story.id}
      initialTitle={story.title}
      initialBody={docToText(story.bodyJson)}
      status={story.status}
      publicUrl={
        story.status === "published"
          ? `/@${viewer.profile.handle}/${story.slug}`
          : null
      }
    />
  );
}
