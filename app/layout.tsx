import type { Metadata } from "next";
import { Caveat, Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Display and story prose. Fraunces is a variable serif with optical sizing,
 * so the same family covers a 56px headline and 19px body text without
 * looking like two different fonts -- and its warmth is what stops the page
 * reading like a dashboard.
 */
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

/**
 * Stands in for a profile photo: initials written rather than set.
 *
 * Caveat over a copperplate script like Mrs Saint Delafield -- those look
 * more like a signature but are drawn with hairlines that disappear
 * entirely at the 32px an avatar is usually seen at. Caveat was designed to
 * stay legible small, which is the whole requirement here.
 */
const caveat = Caveat({
  variable: "--font-signature",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  // Without this, Open Graph image URLs stay relative and every social
  // scraper drops them -- shared links render with no image at all.
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: { default: "Wendfolk", template: "%s · Wendfolk" },
  description: "Long-form travel stories, told properly.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme script writes data-theme before React hydrates, so the
      // server markup and the client will differ on this one attribute.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${caveat.variable} h-full antialiased`}
    >
      {/* pt-16 clears the fixed header on every page; the home hero cancels
          it with -mt-16 so the landscape runs behind the header. */}
      <head>
        {/*
          Runs before first paint. Without it the page renders light, then
          snaps to dark once React mounts -- the flash every hand-rolled
          theme switcher starts with. Inline and synchronous on purpose.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.classList.add('js');}catch(e){document.documentElement.dataset.theme='light';}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col pt-16">
        {/* First tab stop: lets keyboard users jump the nav on every page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div id="main" className="contents">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
