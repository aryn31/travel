import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  /*
   * No providers: sign-in is email and password, verified in
   * app/signin/actions.ts and turned into a session row by
   * lib/auth-session.ts. Auth.js is kept for what it is still doing -- the
   * adapter, the session cookie and signOut() -- not for a sign-in flow it
   * no longer owns.
   */
  providers: [],
  session: { strategy: "database" },
  trustHost: true,
  pages: {
    signIn: "/signin",
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
