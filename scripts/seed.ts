// Env comes from --env-file (see the npm script): a dotenv call here would
// run after the imports below have already read process.env.
import { eq, like, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { media, profiles, stories, users } from "../lib/db/schema";
import { put, publicUrl } from "../lib/storage";
import { docToSummary, docToText, readingMinutes, type Node } from "../lib/story-doc";
import { slugify } from "../lib/slug";
import { landscapePng, type Palette } from "./photo";
import { AUTHORS, type SeedBlock } from "./seed-stories";
import { findPhoto } from "./commons";
import { SEED_DOMAIN, SEED_PASSWORD } from "./seed-config";
import { hashPassword } from "../lib/password";



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

/**
 * Stores a photo through the same path the app uses, so the seed exercises
 * the real storage layer rather than inventing its own.
 *
 * Prefers a real photograph of the place from Wikimedia Commons; falls back
 * to a generated landscape when a search returns nothing, so seeding still
 * works offline.
 */
async function addPhoto(
  ownerId: string,
  storyId: string,
  opts: {
    query: string;
    alt: string;
    seed: number;
    hue: number;
    variant: number;
    landscape?: boolean;
    used: Set<string>;
  },
) {
  const found = await findPhoto(opts.query, {
    landscape: opts.landscape ?? true,
    skip: opts.used,
  });

  let bytes: Buffer;
  let width: number;
  let height: number;
  let ext: string;
  let mime: string;
  let credit: string | null = null;
  let creditUrl: string | null = null;
  let license: string | null = null;
  let sourceUrl: string | null = null;

  if (found) {
    opts.used.add(found.title);
    console.log(`      ${found.title.replace(/^File:/, "").slice(0, 68)}`);
    bytes = found.buffer;
    width = found.width;
    height = found.height;
    mime = found.mime;
    ext = found.mime === "image/png" ? "png" : "jpg";
    credit = found.credit;
    creditUrl = found.creditUrl;
    license = found.license;
    sourceUrl = found.sourceUrl;
  } else {
    console.log(`      (generated) no Commons match for "${opts.query}"`);
    width = opts.landscape === false ? 1200 : 1800;
    height = opts.landscape === false ? 1600 : 1150;
    bytes = landscapePng(width, height, opts.seed, palette(opts.hue, opts.variant));
    mime = "image/png";
    ext = "png";
  }

  const key = `${ownerId}/${crypto.randomUUID()}.${ext}`;
  await put(key, bytes);

  const [row] = await db
    .insert(media)
    .values({
      ownerId,
      storyId,
      storageKey: key,
      width,
      height,
      mime,
      bytes: bytes.byteLength,
      alt: opts.alt,
      credit,
      creditUrl,
      license,
      sourceUrl,
    })
    .returning({ id: media.id });

  return { id: row.id, url: publicUrl(key), width, height, real: Boolean(found) };
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
  used: Set<string>,
): Promise<{ doc: { type: "doc"; content: Node[] }; images: number; real: number }> {
  const content: Node[] = [];
  let images = 0;
  let real = 0;

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
        const photo = await addPhoto(ownerId, storyId, {
          query: block.query,
          alt: block.alt,
          seed: seedBase + images * 977,
          hue,
          variant: images + 1,
          // Every third image portrait, for rhythm down a long story.
          landscape: images % 3 !== 2,
          used,
        });
        if (photo.real) real++;
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

  return { doc: { type: "doc", content }, images, real };
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
  let realCount = 0;

  // Hashed once, not per account: scrypt is deliberately slow, and six
  // identical passwords do not need six derivations.
  const seedPasswordHash = await hashPassword(SEED_PASSWORD);

  for (const author of AUTHORS) {
    const [user] = await db
      .insert(users)
      .values({
        email: author.email,
        emailVerified: new Date(),
        passwordHash: seedPasswordHash,
      })
      .returning({ id: users.id });

    await db.insert(profiles).values({
      userId: user.id,
      handle: author.handle,
      displayName: author.name,
      bio: author.bio,
      homeCountry: author.home,
    });

    // A hue per author, only used by the fallback generator when Commons
    // has nothing for a place.
    const hue = (author.handle.charCodeAt(0) * 37) % 360;

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

      // One story should not show the same photograph twice.
      const used = new Set<string>();

      const cover = published
        ? await addPhoto(user.id, id, {
            query: story.coverQuery,
            alt: "",
            seed: 500 + i * 3313,
            hue,
            variant: 0,
            landscape: true,
            used,
          })
        : null;

      const { doc, images, real } = await buildDoc(
        story.blocks,
        user.id,
        id,
        hue,
        1000 + author.handle.length * 31 + i * 7919,
        used,
      );

      const text = docToText(doc);

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
      realCount += real + (cover?.real ? 1 : 0);
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

  console.log(
    `\n${AUTHORS.length} accounts · ${storyCount} stories · ${photoCount} photos ` +
      `(${realCount} real from Commons, ${photoCount - realCount} generated)`,
  );
  console.log(`\nSign in as any of them at /signin with password: ${SEED_PASSWORD}`);
  for (const a of AUTHORS) console.log(`  ${a.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
