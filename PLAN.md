# Wendfolk — Build Plan

**Stack:** Next.js 16 (App Router, TS) · Postgres · Drizzle · Vercel
**Approach:** lean MVP in ~5 weeks, then layer community + maps

---

## 1. What we're building

A place where people publish long-form travel stories with photos, and readers
discover them by place, tag, or author.

**Core loop (the only thing v1 must nail):**
sign in → write a story with photos → publish → it looks beautiful and is
findable → author gets read + a signal someone read it.

**Why this isn't just a blog:** stories are tied to *places*, and discovery is
shared. A blog gives you a URL; this gives you an audience and a map. That
promise shapes the data model from day one even though the map ships in phase 2.

---

## 2. Scope

### In for v1
- Auth (email magic link; Google deferred until deploy)
- Author profile: handle, display name, avatar, bio, their story list
- Story editor: rich text, inline images, cover image, autosaving drafts
- Publish / unpublish, edit after publish
- Reading page: fast, typographic, mobile-first, good OG previews
- Home: recent + editor-picked stories
- Tags + a single country/city field per story
- Search (Postgres full-text)
- Likes and comments
- Reports + soft delete + basic admin view

### Explicitly out of v1
Maps and pins · follows and personalized feed · notifications · email digests ·
collections / multi-part trips · drafts shared for review · monetization ·
mobile app · i18n · recommendations

Also out until you deploy: analytics, error tracking, real email delivery,
Google OAuth, legal pages. See Week 5.

> None of this is designed out. §4.4 and §4.5 flag the decisions that keep the
> deferred work cheap to add.

---

## 3. Data model

Concrete enough to write migrations from on day one.

```
users            id, email, created_at, role (user|editor|admin)
profiles         user_id PK/FK, handle UNIQUE, display_name, avatar_url, bio,
                 website, home_country
stories          id, author_id FK, slug, title, subtitle,
                 body_json JSONB,          -- TipTap doc, source of truth
                 body_text TEXT,           -- flattened, for FTS + excerpts
                 cover_media_id FK NULL,
                 status (draft|published|unlisted), published_at NULL,
                 reading_minutes, like_count, comment_count,
                 place_name NULL, country_code NULL,     -- see 4.4
                 lat NULL, lng NULL,
                 search_vector tsvector GENERATED,
                 created_at, updated_at
                 UNIQUE (author_id, slug)
media            id, owner_id FK, storage_key, width, height, mime,
                 bytes, blurhash, alt NULL, created_at
tags             id, slug UNIQUE, name
story_tags       story_id, tag_id  (PK both)
likes            user_id, story_id (PK both), created_at
comments         id, story_id FK, author_id FK, parent_id NULL,
                 body TEXT, created_at, deleted_at NULL
reports          id, reporter_id, story_id NULL, comment_id NULL,
                 reason, note, status, created_at
```

Indexes that matter: `stories(status, published_at DESC)`,
`GIN(search_vector)`, `story_tags(tag_id)`, `comments(story_id, created_at)`.

Counts (`like_count`, `comment_count`) are denormalized and updated in the same
transaction as the write — don't `COUNT(*)` on a list page.

---

## 4. Decisions to get right before writing much code

These are cheap now and expensive in month three.

**4.1 URLs — `/@handle/story-slug`**
Author identity in the path, no global slug collisions, and handles are
trivially portable. Reserve a word list (`about`, `api`, `login`, `admin`, …)
before anyone registers. Keep `/s/:id` as a permanent redirect target so slug
edits never 404.

**4.2 Editor content is TipTap JSON, not HTML**
Store the doc as JSONB and render to React server-side. HTML-in-the-database
means you sanitize forever and can never change how an image block looks.
Maintain `body_text` on every save for search and excerpts.

**4.3 Images never pass through the Next.js server — in either direction**
*Achieved 2026-10-01 for upload, not yet for serve.* Substitute "Supabase
Storage" for "R2" throughout — the shape is identical, and the bucket is
reached by a real presigned PUT, so this is now true rather than imitated.
What is still missing is the CDN half: images are served straight from
`<ref>.supabase.co`, with no custom domain and no cache in front (§10.6).

*Upload:* browser gets a presigned URL → uploads straight to the bucket →
posts back the key plus dimensions. Serverless request body limits make the
naive path fail on exactly the 12MP photos travel writers upload. Store
width/height and a blurhash so the reading page has zero layout shift.
Cap: 15 MB and 20 images per story to start.

*Serve:* R2 behind a Cloudflare custom domain, resized by Cloudflare
transformations, with a custom `next/image` loader pointing at it. Do **not**
use Vercel's built-in optimizer — routing image bytes through Vercel's CDN
incurs Fast Data Transfer on every view, which is the one uncapped line item
on an image-heavy site. See §8.

**4.4 Place is a flat field now, a table later**
`place_name`/`country_code`/`lat`/`lng` on `stories` is enough for v1 filtering
and makes the phase-2 `places` table a backfill instead of a rewrite. Populate
lat/lng even though nothing renders it yet.

**4.5 Run entirely locally, but stay deploy-ready**
*Superseded 2026-10-01: Postgres and images now live in Supabase. Still no
hosting and no domain — the app runs locally against hosted services. The
reasoning below is kept because it is why that switch cost almost nothing,
and the local drivers still work: `STORAGE_DRIVER=local` plus the Docker
container is a complete offline fallback.*

No hosting, no domain, no cloud accounts for now. The one rule that keeps that
from becoming a trap: **every external dependency sits behind a small
interface with a local implementation.** Three of them matter.

| Concern | Local now | Swap later |
| --- | --- | --- |
| Postgres | Docker container | Neon / Supabase — same connection string |
| File storage | `./storage` on disk, served by a route handler | R2 (see §8) |
| Email | magic-link URL printed to the terminal | Resend |

Write `lib/storage.ts` exposing `createUploadUrl()`, `put()`, and
`publicUrl(key)`. The disk version hands back a URL to your own upload route;
the R2 version hands back a presigned S3 URL. The editor code never learns
which one it's talking to, so the upload flow you build today is the one that
ships. Everything configured through env vars, nothing reading `process.cwd()`
outside that one file.

*Tested 2026-10-01 — both seams were used for real, and the result was
lopsided.* Postgres moved to Supabase on a single env var: no code change at
all, because `lib/db/index.ts` already passed `prepare: false` for a pooler
it had never met. Storage moved on a new driver behind `STORAGE_DRIVER` and
`lib/upload-client.ts` needed **zero** changes — it already PUT the blob to
whatever URL it was handed, which is exactly what the interface promised.

What the interface did *not* protect was everything holding a URL rather
than a key. `components/StoryBody.tsx` gated image rendering on
`src.startsWith("/api/media/")`, so flipping the driver would have silently
emptied every story of its photographs, and 18 image nodes had
`/api/media/<key>` baked into `body_json` at insert time. The fix — resolve
any `src` back to its key and regenerate the URL — is what the interface
should have required from the start.

**The lesson worth carrying: store keys, never URLs.** A key survives a
change of provider; a URL is a decision frozen into your data.

---

## 5. Milestones

**Week 0 — foundation ✅ done**
Scaffold, Tailwind + shadcn/ui, Drizzle against a Docker Postgres, Auth.js with
a dev email provider that logs the sign-in link to the terminal, `profiles` row
created on first sign-in, handle picker. Skip Google OAuth for now — it needs a
callback URL and a console project, and email-link covers local testing.
Done when: `docker compose up` plus `npm run dev` gets you signed in at
`localhost:3000` from a cold clone.

*As built:* Next.js **16**.3.7 (the plan was written against 15), Postgres 17
on host port **5433** — 5432 was already taken by another project's container.
Google OAuth deferred to deploy time. Verified end to end in a browser:
request link → follow it → pick handle → land on `/@aryan`.

**Week 1 — stories exist ✅ done**
Schema + migrations. `/write` creates a draft, autosaves every few seconds,
`/drafts` lists them, publish sets `status` + `published_at`. Plain
textarea is fine here. Done when: a story round-trips DB → page.

*As built:* drafts list at `/drafts`, not `/@me/drafts` — static routes shadow
the `/@handle` segment, so a flat path avoids fighting the router for no gain.
Body is already stored as a TipTap-shaped doc in `body_json` (§4.2), so Week 2
swaps the editor without touching existing drafts. The generated `search_vector`
works today — Week 4's search is mostly wiring. Verified: drafts 404 for
everyone but their author, including a different signed-in user, and never
appear in public listings.

**Week 2 — the editor and images ✅ done**
TipTap with headings, bold/italic, quote, link, list, divider, image block.
Presigned R2 uploads with progress and drag-drop. Cover image picker.
JSON → React renderer shared by editor preview and reading page.
Done when: you publish a real story of your own with eight photos and it looks
good on a phone.

*As built:* uploads go through `lib/storage.ts` with a disk driver behind a
**signed** PUT URL — the signature is what makes the endpoint safe, and it's the
property R2 gives for free (§4.5). Images are resized to 2560px and re-encoded
to WebP **in the browser** before upload: a 3000×2000 PNG went 360 KB → 37 KB,
which is §8's main cost lever working. `components/StoryBody.tsx` renders the
document as a strict allow-list — unknown nodes, `javascript:`/`data:` hrefs and
non-local image sources are dropped, and surviving links get
`rel="noopener noreferrer nofollow ugc"`. Blurhash deferred; intrinsic
width/height already prevent layout shift, which was the point of it.

*Updated 2026-10-01:* the disk driver now has a Supabase sibling behind
`STORAGE_DRIVER`, spoken to over the Storage REST API rather than
`@supabase/supabase-js` — that package bundles realtime, auth and postgrest
clients this app does not use, and the four calls are the whole surface.
Uploads are a real presigned PUT, so the hand-rolled HMAC is now only the
local driver's imitation of it. The strict renderer described above was also
the thing that nearly broke: it gated images on `src.startsWith("/api/media/")`,
which would have silently emptied every story the moment the driver changed.
It now resolves any `src` back to a storage key and regenerates the URL —
a stricter allow-list, and one that survives the next move too.

**Week 3 — reading and identity**
Reading page typography, author byline card, reading time, share + OG image via
`next/og`, JSON-LD `Article`. Public profile page. Home page with recent
stories and an `is_featured` flag you control. ISR with on-publish
revalidation. Done when: a story link pasted into WhatsApp looks intentional.

**Week 4 — discovery and interaction** (search + filter done)
Tag pages, country filter, Postgres FTS search page, likes (optimistic),
threaded-one-level comments with rate limiting. Done when: a stranger can find
a story without a direct link.

*As built (`/stories`):* one page covering the archive, search, country filter,
sort and pagination. Search covers the story **and its author**: a generated
column can only read its own row, so `profiles` carries its own
`search_vector` (display name + handle, name only -- a bio mentioning plantain
should not drag every story that person wrote into the results for
"plantain") with its own GIN index, and the query matches either side,
ranking the author half at 0.4 so a story actually about the word still wins.
`place_name` was added to the story vector at weight A alongside the title — the first thing anyone types on a travel site is
a place, and "Kotor" was in the place field but nowhere in the prose. Dropping
and re-adding a generated column silently takes its index with it, and
drizzle-kit does not re-emit the `CREATE INDEX` because the index definition
never changed; migration `0004` adds it back by hand. The match is FTS *or* a
substring match on title, place, display name and handle: `to_tsquery` only
matches whole lexemes, so "Napl" found nothing -- and "Seok-jin Park" indexes
as three lexemes, so the handle "seokjin" matched none of them. Snippets come from
`ts_headline` with control-character delimiters, split and rendered as
elements, so the highlight is the same match that produced the ranking and no
HTML is ever interpolated. The form is a plain GET — every search is a
shareable URL and it works with no JavaScript at all. Tags, likes and comments
still outstanding.

**Week 5 — hardening (local)**
Reports flow + admin list + soft delete, Lighthouse pass against a production
build (`npm run build && npm start`, not dev mode — dev numbers are
meaningless), seed 15–20 stories of your own so every list, search result, and
empty state is exercised with real content rather than lorem ipsum.

*Free-read meter:* signed-out visitors get one story, then `ReadWall`
replaces the rest. The count lives in an httpOnly cookie of `handle/slug`
keys -- re-opening a story you already spent stays free forever, or a
refresh would slam the wall shut mid-read. It is written in `proxy.ts`
because a Server Component cannot set a cookie and the meter has to be
written on the same request that serves the story; Next 16 renamed
`middleware` to `proxy` and defaults it to the Node.js runtime. The proxy
does no database work and makes no decision -- it reports the cookie's
verdict through a request header (always set, never merely absent, so
"signed in" is distinguishable from "proxy never ran") and the page, which
knows the real viewer, decides. The withheld blocks are never serialised
into the HTML: a CSS-only fade is one Reader Mode away from nothing. A soft
wall, not an entitlement check -- the content is public by design.

*Auth as built:* email + password, with the magic link kept as the second
way in -- which matters because with no mail provider configured the link is
the only account recovery that exists. Passwords are scrypt (N=2^15) from
`node:crypto`, stored as a self-describing `scrypt$N$r$p$salt$key` string, so
the cost parameters can be raised later without invalidating anything.
Auth.js v5's Credentials provider only supports JWT sessions, and this app
wants **database** sessions (a row that can be deleted is what makes
revocation possible), so `lib/auth-session.ts` writes the session row and the
`authjs.session-token` cookie itself; a session made that way is
indistinguishable from one the magic link created. `lib/throttle.ts` locks an
address after 8 failed attempts -- in-memory, which is correct for one
process and wrong the moment there are two (see 10). Changing a password
revokes every other session but keeps the current one.

**Deferred until you choose to deploy:** real email delivery, Google OAuth,
terms / privacy / content policy, Sentry, analytics, opening signups.

*Cold start is the actual risk, not the code.* When launch day does come, don't
open signups on an empty site — invite writers and seed it first.

---

## 6. After the MVP

Roughly in value order:

1. **Maps** — `places` table, backfill from lat/lng, pins on profiles and an
   `/explore` map. This is the differentiator; make it the first phase-2 item.
2. **Follows + feed** — `follows` table, following tab, fan-out on read.
3. **Notifications + weekly digest** — the main retention lever for writers.
4. **Collections / trips** — ordered multi-part stories, the natural unit for
   a two-week trip.
5. **Editorial curation** — themed collections, a homepage someone edits.
6. **Monetization** — paid membership or author tipping, only once there's
   traffic worth converting.

---

## 7. Known risks

| Risk | Mitigation |
| --- | --- |
| Empty site at launch | Seed 15–20 real stories before signups open |
| SEO/affiliate spam signups | Rate-limit publishing, no dofollow links, manual review of first story |
| Image delivery cost (not storage — see §8) | Serve from R2 via Cloudflare transforms, 3 srcset widths, resize on upload |
| Editor scope creep | Ship the 8 marks/nodes listed in week 2, nothing more |
| Maps pulled into v1 | Field-level place data in v1 buys the same option later |

---

## 8. Image cost model

> **Decided 2026-10-01: images live in Supabase Storage.** Postgres moved
> there the same day. The R2 analysis below is kept because it is still the
> cheaper answer at scale and the comparison is what makes the Supabase
> numbers legible — but it describes the road not taken.

### 8.0 What is actually running

| Concern | Where | Free tier | Currently |
| --- | --- | --- | --- |
| Postgres | Supabase, ap-northeast-1 | 500 MB, pauses after ~7 days idle | 8.5 MB |
| Images | Supabase Storage, public bucket `story-images` | 1 GB stored, ~2 GB egress/month | 21 MB, 36 objects |

Storage is nowhere near the limit and will not be for a long time. **Egress
is the line that moves**, because it scales with readers rather than with
how much you host, and a travel site is almost entirely outbound
photographs. At roughly 400 KB a photo and 8 photos a story, 2 GB/month is
on the order of 600 story views. That is the number to watch, not the 1 GB.

Two free-tier behaviours that are not cost but will feel like faults:

- **The project pauses after about a week of inactivity** and needs a manual
  restore from the dashboard. This project is worked on in bursts, so expect
  it. Unlike the Docker container it replaced, you cannot fix it locally.
- **Direct connections (`db.<ref>.supabase.co`) are IPv6-only** on the free
  tier; IPv4 is a paid add-on. On a machine without an IPv6 route, *all*
  traffic including migrations has to go through the pooler. Port 5432 on
  the pooler is session mode, which carries DDL and transactions; port 6543
  is transaction mode and does not. `drizzle.config.ts` prefers `DIRECT_URL`
  for exactly this reason — set it when a real direct connection exists.

### 8.1 The R2 comparison — still the cheaper answer at scale

**Both options are $0 today.** §4.5's storage interface means switching is a
driver, not a rewrite. Recorded so the decision is already made when the
numbers start to matter.

Storage is not the cost. Per-view processing and delivery are, and they scale
with traffic rather than with how many stories you host.
*Prices verified 2026-09-29 — re-check before committing.*

**The one number that decides it: Supabase Storage charges for egress beyond
the free allowance; R2 charges $0 for egress, always.** On a site whose
payload is photographs, that is the whole comparison. Supabase is fine while
traffic is small and keeps everything in one dashboard; the day egress
becomes the bill, move the bytes and keep the database.

**Cloudflare R2** — $0.015/GB-month, free tier 10 GB-month. Class A ops
(uploads) $4.50/M with 1M/month free; Class B (origin reads on CDN miss)
$0.36/M with 10M/month free. **Egress $0.**

| Scale | Stored | R2 cost/month |
| --- | --- | --- |
| 1,000 stories × 8 photos ≈ 8 GB | inside free tier | **$0** |
| 10,000 stories ≈ 80 GB | 80 GB-month | **$1.20** |

**Cloudflare Images transformations** (originals stay in R2, so no storage or
delivery charge — transformations only): 5,000 unique/month free, then
$0.50/1,000. ~5,000 distinct images viewed per month × 3 srcset widths
≈ 15,000 billable → **~$7.50/month**.

**Vercel Image Optimization — avoided deliberately.** Hobby includes 5K
transformations, 300K cache reads, 100K cache writes per month; beyond that
$0.05–0.0812/1K transformations, $0.40–0.64/M read units (8 KB each),
$4.00–6.40/M write units, **plus Fast Data Transfer and CDN requests on every
delivered byte**. The transformation line is small; the transfer line is not
bounded by anything.

**Controls, in order of leverage**
1. Resize to max 2560px long edge at q80 on upload — phone photos land at
   300–600 KB instead of 5 MB.
2. Three srcset widths (640 / 1280 / 2560), not eight. Each width is a
   separately billed transformation.
3. AVIF with WebP fallback; `format` counts as one transformation.
4. Cache TTL of one year on variants — each is generated once, then served
   from cache.
5. Consider R2 Infrequent Access ($0.01/GB-month, 30-day minimum, $0.01/GB
   retrieval) for original uploads you keep but never serve.

**Real floor cost:** Vercel Hobby is restricted to non-commercial personal use,
so a live platform means Pro at $20/month. That, not storage, is the baseline —
images stay in single-digit dollars well past launch.

---

## 9. First commands

```bash
npx create-next-app@latest . --ts --tailwind --app --eslint
npm i drizzle-orm postgres && npm i -D drizzle-kit
npm i next-auth @auth/drizzle-adapter
npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-image
npx shadcn@latest init
```

Local Postgres — `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: travel
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes: { pgdata: }
```

```bash
docker compose up -d
echo 'DATABASE_URL=postgres://postgres:dev@localhost:5433/travel' >> .env.local
echo 'AUTH_SECRET='$(openssl rand -base64 32) >> .env.local
echo 'STORAGE_DRIVER=local' >> .env.local
npx drizzle-kit generate && npx drizzle-kit migrate
npm run dev
```

Hold off on `@aws-sdk/client-s3` until you actually wire R2 — the local storage
driver needs no dependencies. Add `/storage/` to `.gitignore`, and
`git init` this directory so the schema history is tracked from the first
migration.

### 9.1 Running against Supabase (what is configured now)

Docker is no longer needed to run the app — only as a Postgres *client*
(`docker exec travel-db psql …`) if `libpq` is not installed, and as the
rollback copy of the pre-migration database. `npm run dev` is the whole
startup.

```bash
# .env.local — none of this is committed; .gitignore has a blanket .env*
DATABASE_URL=…pooler.supabase.com:5432/postgres   # session mode: carries DDL
# DIRECT_URL=…                                     # only if IPv4 direct exists
STORAGE_DRIVER=supabase
SUPABASE_SERVICE_ROLE_KEY=…                        # server-only, never prefixed
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_BUCKET=story-images
```

The two `NEXT_PUBLIC_` values exist because `components/StoryBody.tsx` is
imported by the editor, so the renderer is bundled into the browser and
needs the project URL and bucket name to validate image sources. Neither is
secret — both appear in every image URL. The service_role key is read in
`lib/storage.ts` and nowhere else.

**Percent-encode the database password.** A literal `%` in a connection URL
is read as a broken escape and `libpq` refuses the whole string — it fails
at connect time, not at parse time, so it looks like a network problem.

**Moving data between the two:**

```bash
docker exec travel-db pg_dump -U postgres -d travel -Fc > travel-backup.dump
docker exec travel-db pg_dump -U postgres -d travel \
  --data-only --no-owner --no-privileges --exclude-schema=drizzle > data.sql
docker exec -i travel-db psql "<url>" -v ON_ERROR_STOP=1 < data.sql
```

`--exclude-schema=drizzle`, not `--exclude-table=__drizzle_migrations`: that
table lives in its own schema, so the unqualified form matches nothing and
the restore dies on a duplicate key. `ON_ERROR_STOP=1` is what makes that a
clean failure instead of a half-loaded database that looks fine. Dumps are
gitignored (`*.dump`) — they hold password hashes and live session tokens.

**Storage commands** (both idempotent, both take `--dry-run`):

```bash
npm run storage:migrate    # copy ./storage into the bucket; keys unchanged
npm run storage:fixkeys    # rename keys whose extension lies about contents
```

The second exists because **Supabase derives `Content-Type` from the file
extension and ignores the upload header** — verified by delete-and-reinsert.
A PNG under a `.webp` key is served as `image/webp` forever, and browsers
sniff and render it anyway, which is why it goes unnoticed.

**Destructive scripts are guarded.** `seed`, `seed:wipe` and `seed:auth`
refuse to run unless `DATABASE_URL` is localhost (`scripts/guard.ts`). The
command that deletes every seeded account is identical whether it points at
a container or a hosted database; `I_MEAN_IT=yes` overrides, per run.

---

## 10. Deployment checklist

*Nothing here is needed to build. This is the list for the day you decide to go
live. Prices verified 2026-09-29.*

### 10.1 Pick a hosting shape first — it decides everything else

| | **Managed** (Vercel + Neon) | **Single VPS** (Hetzner/DO + Docker) |
| --- | --- | --- |
| Cost/month | ~$40 | ~$10 |
| Setup | an afternoon | a weekend |
| You own | nothing | OS updates, TLS renewal, backups, Postgres tuning |
| Scales by | itself | you, manually |
| Good when | you want to write features, not run servers | cost matters more than your weekends |

Vercel's **Hobby plan is restricted to non-commercial personal use**, so a
public platform means **Pro at $20/month** — that is the real floor, not a
nice-to-have. Both shapes run the same code; §4.5's interfaces are what make
that true.

### 10.2 Accounts to open

| Service | For | Cost | Gotcha |
| --- | --- | --- | --- |
| Domain registrar | the domain | ~$10–15/year | Buy before picking a brand name |
| Cloudflare | DNS + image transformations | Free | Transformations: 5,000/month free |
| ~~Cloudflare R2~~ | ~~image storage~~ | — | **Not used — Supabase Storage instead (§8)** |
| **Supabase** ✅ | Postgres **and** images | $0 now | **Read §10.3a before anything else** |
| Resend | magic-link + notification email | $0 → $20 | see 10.4 |
| Google Cloud Console | Google sign-in | Free | see 10.5 |
| Sentry | error tracking | Free tier | — |
| Plausible / Umami | analytics | $9/mo or self-host | Cookieless = no consent banner |
| Vercel | hosting (managed path) | $20/mo Pro | Hobby is non-commercial only |

### 10.3 Postgres — don't ship on the free tier

> **Decided 2026-10-01: Supabase.** The Neon analysis below still stands as
> the comparison, and its conclusion is unchanged by the choice of provider:
> *do not launch on a free tier.* Supabase Free is 500 MB and pauses after
> ~7 days idle — fine for building, not for readers. Price the paid tier
> before opening signups, and read §10.3a first, because it is the part that
> nearly went wrong.

### 10.3a Supabase exposes your tables over HTTP by default

The single most important thing on this page.

Supabase serves the `public` schema over an auto-generated REST API
(PostgREST) using the **anon key** — a key that is public by design and
meant to be shipped inside browser JavaScript. What makes that safe is
row-level security. Tables created through the dashboard get RLS enabled;
**tables created by raw SQL migrations — which is all of ours — do not.**

Measured on this project immediately after the move:

```
RLS:    every table  rls=false
Grants: anon  →  SELECT, INSERT, UPDATE, DELETE, TRUNCATE  on all 7 tables
```

Not merely readable. With nothing but the public anon key, that API would
have served `users.password_hash`, served live tokens out of `sessions` —
which *are* the credential, not a pointer to one: paste one into a cookie
and you are that person, no password involved — and truncated `stories`.

Fixed in migration `0007_lock_out_postgrest.sql`, which does both halves for
every table:

```sql
REVOKE ALL ON public.<table> FROM anon, authenticated;
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
```

The `REVOKE` is the fix. The `ENABLE ROW LEVEL SECURITY` is what keeps it
fixed: Supabase's `ALTER DEFAULT PRIVILEGES` re-grants on tables created
later, and RLS with no policies denies by default, so a future table stays
shut even if the grant comes back. Neither affects the database owner the
app connects as — but verify that rather than assume it, because **RLS fails
closed**, and a page that renders nothing returns the same 200 as a page
that works. Check a write, not just a page load.

It is a migration rather than dashboard clicks so the fix travels with the
repo and a fresh project inherits it, guarded on the `anon` role existing so
it is a no-op against local Postgres.

Still to do by hand, because it is not visible from the database: **API
Settings → Exposed schemas**. Removing `public` there is an independent
third layer.

Neon Free is **0.5 GB storage per project** (plenty — stories are text) but it
**scales to zero after 5 minutes and that cannot be disabled**, so the first
visitor after a quiet hour waits on a cold start. The harder problem: the free
tier's restore window is **6 hours**. Your users' stories and photos are
irreplaceable — six hours is not a backup.

Neon **Launch** is usage-based with no monthly minimum: $0.106/CU-hour and
$0.35/GB-month, restore window up to 7 days. An always-warm 0.25 CU instance is
~182 CU-hours → **~$19/month**. Budget that.

Whichever you pick: **restore a backup into a scratch database once, before
launch.** An untested backup is a guess.

### 10.4 Email is the sneaky blocker

Magic-link auth means **every single sign-in is an email**. Resend Free is
3,000/month but capped at **100/day** — that's your hard ceiling on daily
sign-ins, and it will bite on any traffic spike. Pro is $20/month for 50,000.

You also need a **verified sending domain** before you can mail arbitrary
recipients: SPF and DKIM records at your DNS, plus DMARC. Allow a day for
propagation and a first-send reputation warm-up; links landing in spam looks
identical to broken auth from the user's side.

### 10.5 Google OAuth has a user cap you won't expect

A Google Cloud project with an **unverified** consent screen stays in "Testing"
mode and is limited to **100 users**. Going past that requires publishing the
consent screen, which needs a privacy policy URL and a homepage on your
verified domain. Basic `email`/`profile` scopes don't trigger the heavyweight
security review, but do this two weeks before you need it, not the night before.

### 10.6 Code that does not exist yet

- [x] ~~R2 driver for `lib/storage.ts`~~ — **done as a Supabase driver**
      (`STORAGE_DRIVER=supabase`). Real presigned `PUT`, so the browser
      uploads straight to the bucket and the bytes never touch this server.
      No bucket CORS config was needed.
- [ ] A CDN/custom domain in front of the bucket, so image URLs are not tied
      to `<ref>.supabase.co` and egress can be fronted by a cache (§4.3, §8)
- [ ] Password reset by email — there is none. With no mail provider, the
      magic link **is** the only account recovery that exists (§10.4)
- [ ] Resend adapter for Auth.js, and an actual HTML magic-link email
- [ ] Google provider + callback URLs for prod *and* preview origins
- [ ] `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` set in host env
- [ ] Migrations as a **deliberate deploy step**, never automatic on build —
      two concurrent builds must not race the same migration
- [ ] `next.config.ts`: `images.remotePatterns` for your image domain, security
      headers (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame-deny)
- [ ] `robots.txt`, `sitemap.xml` (published stories only), canonical URLs,
      `noindex` on drafts and unlisted stories
- [ ] Rate limiting with a **shared** store — in-memory counters are per-instance
      and therefore fake. `lib/throttle.ts` is exactly this: correct for one
      process, wrong the moment there are two. A Postgres table is fine;
      Upstash Redis if you prefer.
- [ ] Supabase **API Settings → Exposed schemas**: remove `public` (§10.3a)
- [ ] Sentry init (server + client) and source-map upload
- [ ] `/api/health` that actually checks the DB, for uptime monitoring

### 10.7 Legal — the part that actually matters with user uploads

The moment strangers upload photos, these stop being optional:

- [ ] **Terms of Service with an explicit license grant.** Users must grant you
      the right to host, display, resize, and thumbnail their photos. Without
      it you have no legal basis for serving the derivatives your own pipeline
      creates. This is the single most-skipped item.
- [ ] **Privacy policy** naming your subprocessors by name (Vercel, Neon,
      Cloudflare, Resend, Sentry) and what each receives
- [ ] **Content policy** + a **DMCA / copyright takedown contact**. Travel
      photography gets stolen in both directions; you need a documented process
      and a real email address before a claim arrives.
- [ ] **GDPR**: data export and hard delete for accounts. Travel audiences are
      international by definition — assume EU visitors from day one.
- [ ] Minimum age clause; cookie consent only if you use cookie-based analytics
      (pick cookieless and skip the banner)

Boilerplate generators are fine starting points, but the license grant clause is
worth getting a human to read.

### 10.8 Before opening signups

- [ ] Publish rate limit (e.g. 3 stories/day for new accounts)
- [ ] Disposable-email-domain blocklist at signup
- [ ] First story from a new author held for review — the cheapest possible
      spam filter, and travel content is a prime SEO/affiliate spam target
- [ ] `rel="nofollow ugc"` on all user-authored outbound links, so you aren't
      a link farm
- [ ] Uptime monitor (Better Stack / Cronitor free tiers) pointed at `/api/health`
- [ ] R2 **versioning or a second bucket** — object storage is not backed up by
      default and a bad delete is permanent
- [ ] Spend caps: Vercel Spend Management, and a billing alert on Neon

### 10.9 Realistic monthly cost at launch

| Item | Managed | VPS |
| --- | --- | --- |
| Hosting | $20 (Vercel Pro) | $6–12 |
| Postgres | ~$25 (Supabase Pro) | included |
| Image storage | $0 (inside Supabase Pro) | $0 |
| Image transformations | $0–8 | $0–8 |
| Email | $0 → $20 | $0 → $20 |
| Domain | ~$1 | ~$1 |
| **Total** | **~$40–68** | **~$8–40** |

Traffic-independent and boring, which is the goal. The number only moves when
you get popular enough to enjoy paying it.

One caveat now that images live in Supabase rather than R2: **egress is not
traffic-independent.** R2's $0 egress is what made that row flat. Supabase
bundles an allowance and charges past it, so on a photo-heavy site the image
line grows with readers. Put a CDN in front of the bucket (§10.6) before
that matters, or move the bytes to R2 and keep the database where it is.

