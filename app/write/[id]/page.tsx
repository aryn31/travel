import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { media, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { publicUrl } from "@/lib/storage";
import { countries } from "@/lib/countries";
import { knownPlaces } from "@/lib/places";
import { popularTags, tagsForStory, tagsToInput } from "@/lib/tags";
import { Editor } from "./Editor";

export const metadata = { title: "Write" };

export default async function WritePage({ params }: PageProps<"/write/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");

  const [row] = await db
    .select({ story: stories, cover: media })
    .from(stories)
    .leftJoin(media, eq(media.id, stories.coverMediaId))
    .where(and(eq(stories.id, id), eq(stories.authorId, viewer.userId)))
    .limit(1);

  if (!row) notFound();
  const { story, cover } = row;

  /* Loaded with the page rather than fetched on keystrokes -- see
     lib/places.ts. */
  const [places, storyTagList, tagSuggestions] = await Promise.all([
    knownPlaces(),
    tagsForStory(story.id),
    popularTags(),
  ]);

  return (
    <Editor
      storyId={story.id}
      initialTitle={story.title}
      initialDoc={story.bodyJson}
      status={story.status}
      publicUrl={
        story.status === "published"
          ? `/@${viewer.profile.handle}/${story.slug}`
          : null
      }
      initialCover={
        cover ? { id: cover.id, url: publicUrl(cover.storageKey) } : null
      }
      initialPlace={story.placeName ?? ""}
      initialCountry={story.countryCode ?? ""}
      countryList={countries()}
      places={places}
      initialTags={tagsToInput(storyTagList)}
      tagSuggestions={tagSuggestions}
    />
  );
}
