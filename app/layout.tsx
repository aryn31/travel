import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  // Without this, Open Graph image URLs stay relative and every social
  // scraper drops them -- shared links render with no image at all.
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: { default: "Travel Stories", template: "%s · Travel Stories" },
  description: "Long-form travel stories, told properly.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* pt-16 clears the fixed header on every page; the home hero cancels
          it with -mt-16 so the landscape runs behind the header. */}
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
