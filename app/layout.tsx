import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
