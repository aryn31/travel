import { Avatar } from "@/components/ui/Avatar";
import { publicUrl } from "@/lib/media-url";
import { flagFor } from "@/components/ui/PlaceMark";
import { ButtonLink } from "@/components/ui/Button";
import type { Profile } from "@/lib/db/schema";

/**
 * The top of a writer's page, built like the cover of their own issue.
 *
 * It used to be a grey strip with a name and three grey facts in it, on a
 * site where every other page is a poster. The facts were right; they were
 * just whispered.
 *
 * Two columns on a wide screen: the person on the left, the evidence on the
 * right. Everything stacked in one left-aligned column left two thirds of
 * an 82rem page empty, which read as a page still loading rather than a
 * page with room to breathe.
 */

/*
 * One colour per writer, from the handle, so a person's page is the same
 * every visit and two writers never look like the same page twice.
 *
 * Saturated, with the type knocked out in the page colour -- the same
 * treatment as the pull-quote band, which is the strongest thing on the
 * home page. The pale tints these replaced were the washed-out relatives of
 * these exact hues: enough colour to notice, not enough to mean anything.
 *
 * Both themes work from one class because --background flips with the
 * theme: cream type on deep teal in light, near-black type on bright teal
 * in dark. The band never needs a dark: variant.
 */
const HUES = [
  "bg-sea",
  "bg-accent",
  "bg-moss",
  "bg-plum",
  "bg-indigo",
];

/* --sun is deliberately absent. Measured against the cream page colour it
   gives 2.55:1, under the 4.5 body text needs; the five above run 4.7 to
   8.7. Mustard is the one hue in this palette that wants dark type, and a
   per-hue ink rule would have to thread through the card border, the
   stamps and the rule as well -- five colours is plenty. */

function hueFor(seed: string) {
  // FNV-1a with an avalanche step, for the reason set out in ui/Avatar.tsx:
  // a plain character sum collapses onto a handful of buckets.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x21f0aaad);
  h ^= h >>> 15;
  return HUES[(h >>> 0) % HUES.length];
}

export type ProfileStats = {
  stories: number;
  countries: string[];
  minutes: number;
};

export function ProfileHeader({
  profile,
  stats,
  isMe,
}: {
  profile: Profile;
  stats: ProfileStats;
  isMe: boolean;
}) {
  const hue = hueFor(profile.handle);
  const hasCover = Boolean(profile.coverKey);
  const site = profile.website
    ? profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;

  return (
    <header>
      {/* The banner. Without one the tinted band alone carries the page, so
          a profile never looks like it is missing something. */}
      {profile.coverKey && (
        <div className="relative h-44 w-full overflow-hidden bg-surface sm:h-60 lg:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element -- straight
              from the bucket, already cropped to 1600px on upload. */}
          <img
            src={publicUrl(profile.coverKey)}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
          {/* The portrait sits on the seam below, so the foot of the photo
              is darkened to keep it legible over any image. */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent"
          />
        </div>
      )}

      <div className={`band topo ${hue} text-background`}>
        <div
          className={`page grid gap-10 pb-14 sm:pb-16 lg:grid-cols-[1.5fr_auto] lg:gap-16 ${
            hasCover ? "pt-0" : "pt-14 sm:pt-16"
          }`}
        >
          {/* ---------------------------------------------------------- *
           * Who they are
           * ---------------------------------------------------------- */}
          <div className="min-w-0">
            {/* Portrait above the name rather than beside it: at 5rem it is
                a photograph, and a photograph next to a 6xl headline reads
                as a bullet point. With a banner it straddles the seam --
                the one element allowed to cross it. */}
            <span
              className={`inline-block rounded-full ring-4 ring-background ${
                hasCover ? "-mt-10 sm:-mt-12" : ""
              }`}
            >
              <Avatar
                name={profile.displayName}
                handle={profile.handle}
                avatarKey={profile.avatarKey}
                size="lg"
              />
            </span>

            <h1 className="font-display mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              {profile.displayName}
            </h1>
            <p className="mt-2 text-lg font-medium text-background/70">
              @{profile.handle}
            </p>

            {profile.bio && (
              <p className="font-display mt-7 max-w-xl text-balance text-2xl leading-snug text-background/90 sm:text-3xl">
                {profile.bio}
              </p>
            )}

            <span
              aria-hidden
              className="mt-8 block h-1.5 w-20 rounded-full bg-background/45"
            />

            {(profile.homeCountry || site) && (
              <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {profile.homeCountry && (
                  <span className="text-background/70">
                    Based in{" "}
                    <span className="font-medium text-background">
                      {profile.homeCountry}
                    </span>
                  </span>
                )}
                {site && (
                  <a
                    href={profile.website!}
                    // User-supplied link on a public page: the same policy
                    // the story renderer applies to links in prose.
                    rel="noopener noreferrer nofollow ugc"
                    target="_blank"
                    className="max-w-full truncate font-medium text-background underline underline-offset-4 decoration-background/50 hover:decoration-background"
                  >
                    {site}
                  </a>
                )}
              </p>
            )}
          </div>

          {/* ---------------------------------------------------------- *
           * What they have done
           *
           * A card rather than loose text: it gives the right half of the
           * page something with edges, which is what the emptiness was.
           * ---------------------------------------------------------- */}
          <div
            className={`lg:w-80 ${
              /* Clear of the banner. The portrait is allowed to cross the
                 seam; a panel of numbers butting straight into a photograph
                 just looks like a collision. */
              hasCover ? "lg:pt-10" : ""
            }`}
          >
            {/* Not <ButtonLink variant="secondary">: its border and hover
                are defined against the page background and vanish on a
                saturated ground. */}
            {isMe && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <OwnerLink href="/settings">Edit profile</OwnerLink>
                <OwnerLink href="/drafts">Your stories</OwnerLink>
              </div>
            )}

            <div className="rounded-2xl border-2 border-background/25 bg-background/10 p-6 backdrop-blur-sm">
              {/* The numbers, set as numbers. "3 stories" in grey body text
                  is a fact nobody reads; the figure at display size is the
                  first thing you see after the name. */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Stat
                  label={stats.stories === 1 ? "story" : "stories"}
                  value={stats.stories}
                />
                {stats.countries.length > 0 && (
                  <Stat
                    label={stats.countries.length === 1 ? "country" : "countries"}
                    value={stats.countries.length}
                  />
                )}
                {stats.minutes > 0 && (
                  <Stat label="minutes read" value={stats.minutes} />
                )}
                <Stat
                  label="writing since"
                  value={profile.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                />
              </dl>

              {stats.countries.length > 0 && (
                <div className="mt-6 border-t border-background/25 pt-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-background/60">
                    Been to
                  </p>
                  <p className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {stats.countries.map((code, i) => (
                      <span
                        key={code}
                        aria-hidden
                        className="inline-grid size-8 place-items-center rounded-md border border-dashed border-background/45 bg-background/15 text-base leading-none"
                        /* Each stamp at its own angle, as on the writers row
                           -- a squared-up line of them looks printed, not
                           stamped. */
                        style={{ transform: `rotate(${((i * 7) % 11) - 5}deg)` }}
                      >
                        {flagFor(code)}
                      </span>
                    ))}
                  </p>
                  <span className="sr-only">
                    {stats.countries.length} countries written about
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  /* A date is wider than a count and wraps at the same size -- "Sep 2026"
     broke across two lines next to a single digit. */
  const isCount = typeof value === "number";

  return (
    <div>
      <dd
        className={`font-display font-semibold leading-none tracking-tight ${
          isCount ? "text-3xl" : "text-xl"
        }`}
      >
        {value}
      </dd>
      <dt className="mt-1.5 text-xs uppercase leading-tight tracking-[0.14em] text-background/60">
        {label}
      </dt>
    </div>
  );
}

/** A link styled to survive on a saturated band. */
function OwnerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <ButtonLink
      href={href}
      size="sm"
      className="border-2 border-background/40 bg-transparent text-background hover:bg-background/15"
    >
      {children}
    </ButtonLink>
  );
}
