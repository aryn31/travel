import type { NextConfig } from "next";

/**
 * Headers every response carries.
 *
 * The Content-Security-Policy is deliberately not here: it contains a
 * per-request nonce, and anything in this file is the same string for
 * every response. It lives in proxy.ts.
 *
 * These five are static by nature, so they belong where they are stated
 * once rather than minted on each request.
 */
const SECURITY_HEADERS = [
  {
    /*
     * Nine weeks, with subdomains. Not the two-year `preload` value: that
     * is a one-way door -- browsers ship the list compiled in, and getting
     * off it takes months -- and this site has never been served over
     * HTTPS in anger. Raise it once the certificate has proven itself.
     */
    key: "Strict-Transport-Security",
    value: "max-age=5184000; includeSubDomains",
  },
  {
    // Stops a browser deciding an uploaded .jpg is really HTML and running
    // it. The one header with no downside at all.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    /*
     * The origin travels, the path does not. A reader following a link
     * from a draft or a private story should not hand the destination the
     * URL of something nobody else can see.
     */
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Nothing here asks for a camera, a microphone or a location, so
    // nothing should be able to ask on the site's behalf.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // For browsers predating frame-ancestors, which the CSP also sets.
    key: "X-Frame-Options",
    value: "DENY",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
