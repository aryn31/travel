import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer, isModerator } from "@/lib/session";
import { addableStories, entriesOf, findOwn } from "@/lib/collections";
import { CollectionEditor } from "./Editor";

export const metadata = { title: "Edit trip" };

export default async function EditCollectionPage({
  params,
}: PageProps<"/collections/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");
  /* Staff accounts do not write -- see isModerator in lib/session.ts. A
     redirect rather than a 404: the page plainly exists, it is just not
     this account's business, and sending them where they belong is more
     use than pretending otherwise. */
  if (isModerator(viewer)) redirect("/admin");

  // Scoped to the owner, so someone else's id is a 404 rather than a 403 --
  // the same rule the rest of the site follows.
  const collection = await findOwn(id, viewer.userId);
  if (!collection) notFound();

  const [entries, addable] = await Promise.all([
    entriesOf(id, true),
    addableStories(viewer.userId, id),
  ]);

  return (
    <main className="page flex-1 py-12 pb-24">
      <Link
        href="/collections"
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        ← All trips
      </Link>

      <div className="mt-6">
        <CollectionEditor
          collectionId={collection.id}
          initialTitle={collection.title}
          initialDescription={collection.description ?? ""}
          status={collection.status}
          publicHref={`/@${viewer.profile.handle}/trips/${collection.slug}`}
          entries={entries.map((e) => ({
            id: e.id,
            title: e.title,
            href: `/@${e.handle}/${e.slug}`,
            status: e.status,
            readingMinutes: e.readingMinutes,
            placeName: e.placeName,
          }))}
          addable={addable}
        />
      </div>
    </main>
  );
}
