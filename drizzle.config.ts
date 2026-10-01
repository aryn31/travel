import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so it doesn't pick up .env.local on its own.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  /*
   * Migrations run DDL inside transactions, which a transaction-mode
   * connection pooler cannot carry. Against a pooled provider (Supabase,
   * Neon) DATABASE_URL points at the pooler and DIRECT_URL at the database
   * itself; locally there is no pooler and the two are the same thing.
   */
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
