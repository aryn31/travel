/**
 * Finds a real photograph of a place on Wikimedia Commons.
 *
 * Commons is used because it needs no API key and its images are genuinely
 * of the places named. Most are CC BY-SA, which requires attribution -- the
 * licence and photographer come back with the image and are stored on the
 * media row even though nothing renders them yet.
 */

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "WendfolkSeed/1.0 (local development seed script)";

/**
 * Commons rate-limits hard, and an unthrottled seed run gets 429s after
 * roughly ten requests. The first version swallowed those and fell back to
 * generated art, so half the photos were quietly fake. Requests are now
 * serialised with a minimum gap and retried with backoff.
 */
const MIN_GAP_MS = 1100;
const MAX_ATTEMPTS = 4;

let chain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Serialises every request through one queue and paces them. */
function queued<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastRequestAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      return await fn();
    } finally {
      lastRequestAt = Date.now();
    }
  });
  // Keep the chain alive even if this link rejects.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run as Promise<T>;
}

async function politeFetch(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await queued(() => fetch(url, { headers: { "User-Agent": UA } }));
    if (res.status !== 429 && res.status !== 503) return res;
    if (attempt >= MAX_ATTEMPTS) return res;

    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : MIN_GAP_MS * 2 ** attempt;
    await sleep(backoff);
  }
}

export type CommonsPhoto = {
  buffer: Buffer;
  width: number;
  height: number;
  mime: string;
  credit: string;
  creditUrl: string;
  license: string;
  sourceUrl: string;
  title: string;
};

/**
 * Commons keyword search matches anything whose description mentions the
 * term, which for a place name includes species named after it, coats of
 * arms, maps and documents. A search for "Salta Argentina" returned a moth
 * on a black background as the best-ranked landscape image.
 */
const NOT_A_PLACE_PHOTO =
  /\b(moth|butterfl|beetle|insect|larva|caterpillar|spider|specimen|holotype|paratype|herbarium|fungus|lichen|mollusc|snail|fossil|skull|schist|gneiss|granite[_ ]sample|thin[_ ]section|coat[_ ]of[_ ]arms|blason|wappen|escudo|flag|banner|seal|coin|banknote|stamp|postcard|logo|icon|diagram|chart|graph|map|karte|mapa|plan[_ ]of|cadastr|manuscript|document|letter|titlepage|title[_ ]page|book|poster|sheet[_ ]music|portrait[_ ]of|bust[_ ]of|grave|tombstone|headstone|locator)\b/i;

/**
 * Natural-history specimen plates are titled with a Latin binomial and a
 * museum accession code rather than the word "moth", so the list above never
 * catches them. These patterns do.
 */
const SPECIMEN_PLATE =
  /\b(MHNT|MNHN|NHMUK|ZSM|USNM|RMNH|AMNH|BMNH)\b|\b(ventral|dorsal)\b/i;

/** Titles that read like a photograph of somewhere, used to break ties. */
const LOOKS_LIKE_A_PLACE =
  /\b(view|views|panorama|vista|skyline|harbou?r|port|marina|quay|beach|bay|coast|shore|cliff|street|avenue|plaza|square|market|old[_ ]town|city|town|village|castle|cathedral|church|mosque|temple|bridge|mountain|mountains|peak|ridge|valley|lake|loch|river|sunset|sunrise|aerial)\b/i;

function stripHtml(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

type Candidate = {
  title: string;
  thumburl: string;
  thumbwidth: number;
  thumbheight: number;
  descriptionurl: string;
  mime: string;
  credit: string;
  creditUrl: string;
  license: string;
};

async function search(query: string, width: number): Promise<Candidate[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    iiurlwidth: String(width),
  });

  const res = await politeFetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`Commons search ${res.status} for "${query}"`);

  const data = (await res.json()) as {
    query?: { pages?: Record<string, {
      title: string;
      imageinfo?: {
        thumburl?: string; thumbwidth?: number; thumbheight?: number;
        descriptionurl?: string; mime?: string; width?: number; height?: number;
        extmetadata?: Record<string, { value?: string }>;
      }[];
    }> };
  };

  const pages = Object.values(data.query?.pages ?? {});
  const out: Candidate[] = [];

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info.thumbwidth || !info.thumbheight) continue;
    // Only formats the app already serves.
    if (info.mime !== "image/jpeg" && info.mime !== "image/png") continue;
    // Skip anything tiny -- usually a logo, map or diagram rather than a photo.
    if ((info.width ?? 0) < 1200) continue;

    // Drop things that are plainly not a photograph of a place.
    if (NOT_A_PLACE_PHOTO.test(page.title)) continue;
    if (SPECIMEN_PLATE.test(page.title)) continue;

    const meta = info.extmetadata ?? {};
    out.push({
      title: page.title,
      thumburl: info.thumburl,
      thumbwidth: info.thumbwidth,
      thumbheight: info.thumbheight,
      descriptionurl: info.descriptionurl ?? "",
      mime: info.mime,
      credit: stripHtml(meta.Artist?.value) || "Unknown",
      creditUrl: info.descriptionurl ?? "",
      license: stripHtml(meta.LicenseShortName?.value) || "see source",
    });
  }

  return out;
}

/**
 * @param landscape prefer a wide crop (covers) over a portrait one.
 * @param skip      titles already used, so one story doesn't repeat a photo.
 */
export async function findPhoto(
  query: string,
  { width = 1600, landscape = true, skip = new Set<string>() } = {},
): Promise<CommonsPhoto | null> {
  let candidates: Candidate[];
  try {
    candidates = await search(query, width);
  } catch (err) {
    // Visible, not silent: a swallowed failure here means a generated image
    // silently standing in for a real place.
    console.warn(`    ! ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const unused = candidates.filter((c) => !skip.has(c.title));
  if (unused.length === 0) return null;

  // Rank by closeness to a usable aspect ratio, not by the most extreme one.
  // Sorting widest-first kept picking 1600x229 panoramas, which are useless
  // as a cover.
  const target = landscape ? 1.6 : 0.75;
  const ranked = unused
    .map((c) => ({
      c,
      ratio: c.thumbwidth / c.thumbheight,
      // A title that names a view, a harbour or a street is far more likely
      // to be the photograph someone wants than one that merely mentions the
      // place. Ranked ahead of aspect ratio, not instead of it.
      scenic: LOOKS_LIKE_A_PLACE.test(c.title) ? 0 : 1,
    }))
    // Anything wildly out of range is a panorama or a banner, not a photo.
    .filter(({ ratio }) => ratio > 0.45 && ratio < 2.6)
    .sort(
      (a, b) =>
        a.scenic - b.scenic ||
        Math.abs(a.ratio - target) - Math.abs(b.ratio - target),
    )
    .map(({ c }) => c);

  if (ranked.length === 0) return null;

  for (const pick of ranked) {
    try {
      const res = await politeFetch(pick.thumburl);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength < 10_000) continue;

      return {
        buffer,
        width: pick.thumbwidth,
        height: pick.thumbheight,
        mime: pick.mime,
        credit: pick.credit,
        creditUrl: pick.creditUrl,
        license: pick.license,
        sourceUrl: pick.descriptionurl,
        title: pick.title,
      };
    } catch {
      continue;
    }
  }

  return null;
}
