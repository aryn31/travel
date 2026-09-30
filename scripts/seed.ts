// Env comes from --env-file (see the npm script): a dotenv call here would
// run after the imports below have already read process.env.
import { eq, like, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { media, profiles, stories, users } from "../lib/db/schema";
import { put, publicUrl } from "../lib/storage";
import { docToSummary, docToText, readingMinutes, type Node } from "../lib/story-doc";
import { slugify } from "../lib/slug";
import { landscapePng, type Palette } from "./photo";
import { AUTHORS, type SeedBlock, type SeedStory } from "./seed-content";

const SEED_DOMAIN = "@seed.local";

function palette(hue: number, variant: number): Palette {
  const h = (hue + variant * 17) % 360;
  const hsl = (deg: number, s: number, l: number): [number, number, number] => {
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + deg / 30) % 12;
      return Math.round(
        255 * (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) / 1,
      );
    };
    return [f(0), f(8), f(4)];
  };
  return {
    skyTop: hsl(h, 55, 0.32),
    skyLow: hsl((h + 30) % 360, 45, 0.72),
    sun: hsl((h + 45) % 360, 70, 0.86),
    ridges: [
      hsl(h, 25, 0.52),
      hsl(h, 28, 0.38),
      hsl(h, 30, 0.24),
    ],
    water: hsl(h, 35, 0.28),
  };
}

/** Upload a generated photo the same way the app would, so the seed exercises
 *  the real storage path rather than inventing its own. */
async function addPhoto(
  ownerId: string,
  storyId: string,
  seed: number,
  hue: number,
  variant: number,
  alt: string,
  portrait = false,
) {
  const width = portrait ? 1200 : 1800;
  const height = portrait ? 1600 : 1150;
  const bytes = landscapePng(width, height, seed, palette(hue, variant));
  const key = `${ownerId}/${crypto.randomUUID()}.png`;

  await put(key, bytes);
  const [row] = await db
    .insert(media)
    .values({
      ownerId,
      storyId,
      storageKey: key,
      width,
      height,
      mime: "image/png",
      bytes: bytes.byteLength,
      alt,
    })
    .returning({ id: media.id });

  return { id: row.id, url: publicUrl(key), width, height };
}

function textNode(text: string): Node {
  return { type: "text", text };
}

async function buildDoc(
  blocks: SeedBlock[],
  ownerId: string,
  storyId: string,
  hue: number,
  seedBase: number,
): Promise<{ doc: { type: "doc"; content: Node[] }; images: number }> {
  const content: Node[] = [];
  let images = 0;

  for (const block of blocks) {
    switch (block.t) {
      case "p":
        content.push({ type: "paragraph", content: [textNode(block.text)] });
        break;
      case "h":
        content.push({
          type: "heading",
          attrs: { level: 2 },
          content: [textNode(block.text)],
        });
        break;
      case "quote":
        content.push({
          type: "blockquote",
          content: [{ type: "paragraph", content: [textNode(block.text)] }],
        });
        break;
      case "list":
        content.push({
          type: "bulletList",
          content: block.items.map((item) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [textNode(item)] }],
          })),
        });
        break;
      case "img": {
        const photo = await addPhoto(
          ownerId,
          storyId,
          seedBase + images * 977,
          hue,
          images + 1,
          block.alt,
          images % 3 === 2,
        );
        content.push({
          type: "image",
          attrs: {
            src: photo.url,
            alt: block.alt,
            width: photo.width,
            height: photo.height,
          },
        });
        images++;
        break;
      }
    }
  }

  return { doc: { type: "doc", content }, images };
}

async function main() {
  const wipeOnly = process.argv.includes("--wipe");

  // Idempotent: seeded accounts are identifiable by their email domain, so a
  // re-run replaces them and never touches a real account.
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `%${SEED_DOMAIN}`));

  if (existing.length > 0) {
    const ids = existing.map((u) => u.id);
    const keys = await db
      .select({ storageKey: media.storageKey })
      .from(media)
      .where(sql`${media.ownerId} in ${ids}`);

    await db.delete(users).where(like(users.email, `%${SEED_DOMAIN}`));

    const { remove } = await import("../lib/storage");
    await Promise.allSettled(keys.map((k) => remove(k.storageKey)));
    console.log(`  removed ${existing.length} seeded accounts and ${keys.length} files`);
  }

  if (wipeOnly) {
    console.log("wiped. (--wipe)");
    return;
  }

  let storyCount = 0;
  let photoCount = 0;

  for (const author of AUTHORS) {
    const [user] = await db
      .insert(users)
      .values({ email: author.email, emailVerified: new Date() })
      .returning({ id: users.id });

    await db.insert(profiles).values({
      userId: user.id,
      handle: author.handle,
      displayName: author.name,
      bio: author.bio,
      homeCountry: author.home,
    });

    for (const [i, story] of author.stories.entries()) {
      const id = crypto.randomUUID();
      const published = story.daysAgo !== null;
      const publishedAt = published
        ? new Date(Date.now() - story.daysAgo! * 86_400_000)
        : null;

      // Insert first: media rows reference the story id.
      await db.insert(stories).values({
        id,
        authorId: user.id,
        slug: slugify(story.title),
        title: story.title,
        status: published ? "published" : "draft",
        publishedAt,
        placeName: story.place,
        countryCode: story.country,
        createdAt: publishedAt ?? new Date(),
        updatedAt: publishedAt ?? new Date(),
      });

      const { doc, images } = await buildDoc(
        story.blocks,
        user.id,
        id,
        author.hue,
        1000 + author.handle.length * 31 + i * 7919,
      );

      const text = docToText(doc);
      const cover = published
        ? await addPhoto(user.id, id, 500 + i * 3313, author.hue, 0, "")
        : null;

      await db
        .update(stories)
        .set({
          bodyJson: doc,
          bodyText: text,
          excerpt: docToSummary(doc),
          readingMinutes: readingMinutes(text),
          coverMediaId: cover?.id ?? null,
        })
        .where(eq(stories.id, id));

      storyCount++;
      photoCount += images + (cover ? 1 : 0);
    }

    console.log(`  @${author.handle.padEnd(9)} ${author.stories.length} stories`);
  }

  // Any media row whose file is missing gets a regenerated placeholder at the
  // stored dimensions. Local storage is disposable -- a cleared ./storage
  // shouldn't leave real stories pointing at 404s.
  const { get } = await import("../lib/storage");
  const all = await db
    .select({
      id: media.id,
      storageKey: media.storageKey,
      width: media.width,
      height: media.height,
    })
    .from(media);

  let repaired = 0;
  for (const m of all) {
    if (await get(m.storageKey)) continue;
    const seedNum = [...m.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    await put(
      m.storageKey,
      landscapePng(m.width, m.height, seedNum, palette(seedNum % 360, 0)),
    );
    repaired++;
  }
  if (repaired > 0) console.log(`  repaired ${repaired} missing image files`);

  // Existing stories predate the excerpt column; recompute from their doc so
  // lists stop showing headings run into the following sentence.
  const stale = await db
    .select({ id: stories.id, bodyJson: stories.bodyJson })
    .from(stories);
  for (const row of stale) {
    const summary = docToSummary(row.bodyJson);
    if (summary) {
      await db.update(stories).set({ excerpt: summary }).where(eq(stories.id, row.id));
    }
  }

  console.log(`\n${AUTHORS.length} accounts · ${storyCount} stories · ${photoCount} photos`);
  console.log("\nSign in as any of them at /signin (link prints to this terminal):");
  for (const a of AUTHORS) console.log(`  ${a.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
