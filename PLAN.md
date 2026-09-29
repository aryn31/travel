# Travel Stories Platform — Build Plan

**Stack:** Next.js 15 (App Router, TS) · Postgres · Drizzle · Vercel
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
*Upload:* browser gets a presigned URL → uploads straight to Cloudflare R2 →
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

---

## 5. Milestones

**Week 0 — foundation (2–3 days)**
Scaffold, Tailwind + shadcn/ui, Drizzle against a Docker Postgres, Auth.js with
a dev email provider that logs the sign-in link to the terminal, `profiles` row
created on first sign-in, handle picker. Skip Google OAuth for now — it needs a
callback URL and a console project, and email-link covers local testing.
Done when: `docker compose up` plus `npm run dev` gets you signed in at
`localhost:3000` from a cold clone.

**Week 1 — stories exist**
Schema + migrations. `/write` creates a draft, autosaves every few seconds,
`/@me/drafts` lists them, publish sets `status` + `published_at`. Plain
textarea is fine here. Done when: a story round-trips DB → page.

**Week 2 — the editor and images**
TipTap with headings, bold/italic, quote, link, list, divider, image block.
Presigned R2 uploads with progress and drag-drop. Cover image picker.
JSON → React renderer shared by editor preview and reading page.
Done when: you publish a real story of your own with eight photos and it looks
good on a phone.

**Week 3 — reading and identity**
Reading page typography, author byline card, reading time, share + OG image via
`next/og`, JSON-LD `Article`. Public profile page. Home page with recent
stories and an `is_featured` flag you control. ISR with on-publish
revalidation. Done when: a story link pasted into WhatsApp looks intentional.

**Week 4 — discovery and interaction**
Tag pages, country filter, Postgres FTS search page, likes (optimistic),
threaded-one-level comments with rate limiting. Done when: a stranger can find
a story without a direct link.

**Week 5 — hardening (local)**
Reports flow + admin list + soft delete, Lighthouse pass against a production
build (`npm run build && npm start`, not dev mode — dev numbers are
meaningless), seed 15–20 stories of your own so every list, search result, and
empty state is exercised with real content rather than lorem ipsum.

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

## 8. Image cost model — for when you deploy

**Right now this is all $0:** local Postgres and local disk storage cost
nothing, and §4.5's storage interface means none of the below changes a line of
application code when you switch. Recorded here so the decision is already made
when you need it.

Storage is not the cost. Per-view processing and delivery are, and they scale
with traffic rather than with how many stories you host.
*Prices verified 2026-09-29 — re-check before committing.*

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
echo 'DATABASE_URL=postgres://postgres:dev@localhost:5432/travel' >> .env.local
echo 'AUTH_SECRET='$(openssl rand -base64 32) >> .env.local
echo 'STORAGE_DRIVER=local' >> .env.local
npx drizzle-kit generate && npx drizzle-kit migrate
npm run dev
```

Hold off on `@aws-sdk/client-s3` until you actually wire R2 — the local storage
driver needs no dependencies. Add `/storage/` to `.gitignore`, and
`git init` this directory so the schema history is tracked from the first
migration.

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
| Cloudflare R2 | image storage | $0 (10 GB free) | Needs bucket CORS for browser uploads |
| Neon *or* Supabase | Postgres | see below | see 10.3 |
| Resend | magic-link + notification email | $0 → $20 | see 10.4 |
| Google Cloud Console | Google sign-in | Free | see 10.5 |
| Sentry | error tracking | Free tier | — |
| Plausible / Umami | analytics | $9/mo or self-host | Cookieless = no consent banner |
| Vercel | hosting (managed path) | $20/mo Pro | Hobby is non-commercial only |

### 10.3 Postgres — don't ship on the free tier

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

- [ ] R2 driver for `lib/storage.ts` — presigned `PUT`, plus bucket CORS
      allowing your origin
- [ ] Cloudflare custom domain in front of the bucket + a custom `next/image`
      loader pointing at it (§4.3 — keeps image bytes off Vercel's CDN)
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
      and therefore fake. A Postgres table is fine; Upstash Redis if you prefer.
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
| Postgres | ~$19 (Neon Launch) | included |
| R2 storage | $0 | $0 |
| Image transformations | $0–8 | $0–8 |
| Email | $0 → $20 | $0 → $20 |
| Domain | ~$1 | ~$1 |
| **Total** | **~$40–68** | **~$8–40** |

Traffic-independent and boring, which is the goal. The number only moves when
you get popular enough to enjoy paying it.

