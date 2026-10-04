import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { collections, profiles, sessions, stories, users } from "../lib/db/schema";

/**
 * Walks every page as every kind of visitor and reports what each one got.
 *
 * Written as a script rather than a test because the question it answers
 * -- "can a stranger reach this by typing it" -- is about the running
 * server, cookies and redirects included, not about a function in
 * isolation.
 *
 * Sessions are real rows, created here and deleted at the end, so the
 * requests go through exactly the path a browser's would.
 */
const BASE = "http://localhost:3000";

type Identity = { label: string; cookie: string | null };

async function sessionFor(email: string): Promise<string> {
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const token = randomUUID();
  await db.insert(sessions).values({
    sessionToken: token,
    userId: u.id,
    expires: new Date(Date.now() + 3600_000),
  });
  return token;
}

async function hit(url: string, cookie: string | null) {
  const res = await fetch(BASE + url, {
    redirect: "manual",
    headers: cookie ? { cookie: `authjs.session-token=${cookie}` } : {},
  });
  if (res.status >= 300 && res.status < 400) {
    const to = res.headers.get("location") ?? "";
    return `${res.status}→${to.replace(BASE, "").split("?")[0]}`;
  }
  return String(res.status);
}

async function main() {
  const readerToken = await sessionFor("mira@seed.local");
  const otherToken = await sessionFor("tomas@seed.local");
  const adminToken = await sessionFor("admin@local.seed");

  const identities: Identity[] = [
    { label: "signed out", cookie: null },
    { label: "reader (mira)", cookie: readerToken },
    { label: "other (tomas)", cookie: otherToken },
    { label: "admin", cookie: adminToken },
  ];

  // Things owned by mira, probed by everyone.
  const [miraStory] = await db
    .select({ id: stories.id, slug: stories.slug })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(sql`${profiles.handle} = 'mira' and ${stories.status} = 'published'`)
    .limit(1);
  const [miraDraft] = await db
    .select({ id: stories.id })
    .from(stories)
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .where(sql`${profiles.handle} = 'mira' and ${stories.status} = 'draft'`)
    .limit(1);
  const [miraTrip] = await db
    .select({ id: collections.id, slug: collections.slug })
    .from(collections)
    .innerJoin(profiles, eq(profiles.userId, collections.ownerId))
    .where(sql`${profiles.handle} = 'mira'`)
    .limit(1);

  const urls = [
    "/",
    "/stories",
    "/contact",
    "/signin",
    "/@mira",
    `/@mira/${miraStory.slug}`,
    `/@mira/trips/${miraTrip.slug}`,
    "/write",
    `/write/${miraStory.id}`,
    `/write/${miraDraft?.id ?? miraStory.id}`,
    "/drafts",
    "/collections",
    `/collections/${miraTrip.id}`,
    "/saved",
    "/notifications",
    "/settings",
    "/onboarding",
    "/admin",
    "/admin/stories",
    "/admin/trips",
    "/admin/people",
  ];

  const width = Math.max(...urls.map((u) => u.length));
  console.log(
    "\n  " +
      "URL".padEnd(width) +
      identities.map((i) => i.label.padStart(16)).join(""),
  );
  console.log("  " + "-".repeat(width + 16 * identities.length));

  for (const url of urls) {
    const cells: string[] = [];
    for (const id of identities) {
      cells.push((await hit(url, id.cookie)).padStart(16));
    }
    console.log("  " + url.padEnd(width) + cells.join(""));
  }

  for (const t of [readerToken, otherToken, adminToken]) {
    await db.delete(sessions).where(eq(sessions.sessionToken, t));
  }
  console.log("\n  (test sessions removed)\n");
  process.exit(0);
}

main();
