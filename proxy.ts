import { NextResponse, type NextRequest } from "next/server";
import {
  METER_COOKIE,
  METER_HEADER,
  meter,
  meterCookieOptions,
  parseMeter,
  serializeMeter,
  storyKey,
} from "@/lib/meter";

/**
 * Counts free reads for signed-out visitors.
 *
 * This lives in the proxy for one reason: a Server Component cannot set a
 * cookie, and the meter has to be written on the same request that serves
 * the story. Proxy runs before the route renders and can attach cookies to
 * the response, which nothing inside `app/` can do during a render.
 *
 * It deliberately does no database work and makes no final decision. It
 * reports what the cookie says through a request header; the story page,
 * which knows who the viewer actually is, decides whether to show the wall.
 * (Next 16 renamed `middleware` to `proxy` and defaults it to the Node.js
 * runtime -- see node_modules/next/dist/docs/.../proxy.md.)
 */

/*
 * Matching the whole site and filtering in code: the alternative is a
 * regex that has to encode "two segments, first starts with @ or %40, not
 * a file, not an API route" and stay readable.
 *
 * Prefetches are skipped. next/link prefetches a page before anybody has
 * decided to go there, and both things this proxy does -- counting a free
 * read, minting a nonce -- would be done for a visit that never happens.
 */
export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

/**
 * Where images are allowed to come from.
 *
 * Read from the environment rather than written down: the bucket host is
 * already public -- it is in the src of every photograph on the site --
 * but hardcoding it here would mean a CSP that silently stops matching
 * the day the project moves.
 */
const IMAGE_HOSTS = [process.env.NEXT_PUBLIC_SUPABASE_URL]
  .filter(Boolean)
  .join(" ");

/**
 * The policy, built fresh per request because the nonce is.
 *
 * `strict-dynamic` is what makes this worth having: scripts loaded by a
 * script that already carries the nonce are trusted, so Next's bundles
 * work without listing a single one, and an injected <script> tag does
 * not -- which is the attack the whole exercise is about.
 *
 * `style-src` keeps 'unsafe-inline' and is the one deliberate hole. Six
 * components set a style attribute -- a progress bar's width, an avatar's
 * tilt -- and CSP blocks style attributes unless this is present. A nonce
 * cannot rescue them: adding one to style-src makes the browser ignore
 * 'unsafe-inline' entirely. Inline CSS is a far smaller risk than inline
 * script, and the alternative is a stylesheet class per rotation angle.
 */
function policy(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    // React rebuilds server stack traces with eval in development only.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${IMAGE_HOSTS}`.trim(),
    // next/font self-hosts, so there is no font CDN to allow.
    "font-src 'self'",
    // Uploads go to /api/upload on this origin; ws: is the dev HMR socket.
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    // Nothing on this site posts anywhere else.
    "form-action 'self'",
    // Belt and braces with X-Frame-Options: this is the one browsers obey.
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Only /@handle/slug is metered -- not the profile, not any static route. */
function storyPath(pathname: string): { handle: string; slug: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return null;

  // Next gives the path still encoded, and an @ is often written as %40.
  const first = decodeURIComponent(parts[0]);
  if (!first.startsWith("@")) return null;

  const handle = first.slice(1);
  const slug = decodeURIComponent(parts[1]);
  if (!handle || !slug) return null;

  return { handle, slug };
}

/**
 * True when the request carries an Auth.js session cookie. Deliberately not
 * a validity check -- that needs the database, which the proxy should not
 * touch. A forged or expired cookie only skips the counting; the page still
 * resolves the real viewer and walls anyone it cannot identify.
 */
function looksSignedIn(request: NextRequest): boolean {
  return (
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token")
  );
}

export function proxy(request: NextRequest) {
  /*
   * A fresh nonce for every request. Next reads it back out of the
   * Content-Security-Policy *request* header and stamps it onto its own
   * framework scripts, bundles and inline styles -- which is why the
   * header goes on the request as well as the response.
   */
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = policy(nonce, process.env.NODE_ENV === "development");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  /* Every return below goes through here, so there is no path out of this
     function that forgets the policy. */
  const send = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  const story = storyPath(request.nextUrl.pathname);
  if (!story) return send(NextResponse.next({ request: { headers } }));

  // Always set it, overwriting anything the client sent: a browser can put
  // this header on its own request, and the page must only ever read what
  // the proxy decided. "bypass" is stated rather than implied by absence,
  // so the page can tell "signed in" apart from "proxy never ran".
  if (looksSignedIn(request)) {
    headers.set(METER_HEADER, "bypass");
    return send(NextResponse.next({ request: { headers } }));
  }

  const read = parseMeter(request.cookies.get(METER_COOKIE)?.value);
  const { verdict, next } = meter(read, storyKey(story.handle, story.slug));

  headers.set(METER_HEADER, verdict);
  const response = NextResponse.next({ request: { headers } });

  if (next) {
    response.cookies.set(METER_COOKIE, serializeMeter(next), meterCookieOptions());
  }

  return send(response);
}
