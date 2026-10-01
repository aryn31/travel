/**
 * Refuses to run a destructive script against anything but a local database.
 *
 * `npm run seed:wipe` deletes every seeded account. That is harmless against
 * a container on localhost and is not harmless against a hosted database --
 * and the command is identical either way, so the only thing standing
 * between the two is remembering which DATABASE_URL is currently in
 * .env.local. This removes the remembering.
 */
export function requireLocalDatabase(script: string) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }

  const local =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "db" ||
    host.endsWith(".localhost");

  if (local) return;

  // An explicit opt-in, so the escape hatch exists but cannot be taken by
  // accident -- it has to be typed on the command line, every time.
  if (process.env.I_MEAN_IT === "yes") {
    console.warn(`\n  !! ${script} running against ${host} -- not a local database.\n`);
    return;
  }

  console.error(
    `\n  Refusing to run ${script}: DATABASE_URL points at ${host}, not a local database.\n` +
      `  This script deletes data. If that is genuinely what you want:\n\n` +
      `    I_MEAN_IT=yes npm run ${script}\n`,
  );
  process.exit(1);
}
