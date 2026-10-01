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

/* Matching the whole site and filtering in code: the alternative is a
   regex that has to encode "two segments, first starts with @ or %40, not
   a file, not an API route" and stay readable. */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};

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
  const story = storyPath(request.nextUrl.pathname);
  if (!story) return NextResponse.next();

  const headers = new Headers(request.headers);

  // Always set it, overwriting anything the client sent: a browser can put
  // this header on its own request, and the page must only ever read what
  // the proxy decided. "bypass" is stated rather than implied by absence,
  // so the page can tell "signed in" apart from "proxy never ran".
  if (looksSignedIn(request)) {
    headers.set(METER_HEADER, "bypass");
    return NextResponse.next({ request: { headers } });
  }

  const read = parseMeter(request.cookies.get(METER_COOKIE)?.value);
  const { verdict, next } = meter(read, storyKey(story.handle, story.slug));

  headers.set(METER_HEADER, verdict);
  const response = NextResponse.next({ request: { headers } });

  if (next) {
    response.cookies.set(METER_COOKIE, serializeMeter(next), meterCookieOptions());
  }

  return response;
}
