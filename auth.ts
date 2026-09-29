import NextAuth from "next-auth";
import type { EmailConfig } from "next-auth/providers";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";

/**
 * Dev-only magic link: prints the sign-in URL to the terminal instead of
 * sending mail. Swapping this for Resend is a drop-in replacement of
 * sendVerificationRequest -- nothing else in the app changes. See PLAN.md 10.4.
 */
const TerminalMagicLink = {
  id: "terminal",
  type: "email",
  name: "Email",
  from: "dev@localhost",
  maxAge: 15 * 60,
  options: {},
  async sendVerificationRequest({
    identifier,
    url,
  }: {
    identifier: string;
    url: string;
  }) {
    const line = "─".repeat(72);
    console.log(
      `\n${line}\n  SIGN-IN LINK for ${identifier}\n  (expires in 15 minutes -- cmd-click to open)\n\n  ${url}\n${line}\n`,
    );
  },
} as EmailConfig;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [TerminalMagicLink],
  session: { strategy: "database" },
  trustHost: true,
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/check",
    error: "/signin",
  },
  callbacks: {
    // Build the client-visible session explicitly. The database session object
    // also carries sessionToken, and returning it as-is publishes the value of
    // an httpOnly cookie through /api/auth/session -- readable by any script
    // on the page, which defeats the point of httpOnly.
    session({ session, user }) {
      return {
        expires: session.expires,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
      } as unknown as typeof session;
    },
  },
});
