/**
 * Shows which Commons file a query would pick, without re-seeding.
 * Usage: npm run photo -- "Inverie Knoydart" "Accra skyline Ghana"
 */
import { findPhoto } from "./commons";

async function main() {
  const queries = process.argv.slice(2);
  if (queries.length === 0) {
    console.log('usage: npm run photo -- "query" ["query" ...]');
    process.exit(1);
  }
  for (const q of queries) {
    const hit = await findPhoto(q, { landscape: true });
    console.log(
      hit
        ? `  ${q}\n      -> ${hit.title.replace(/^File:/, "")}  [${hit.width}x${hit.height}, ${hit.license}]`
        : `  ${q}\n      -> no match`,
    );
  }
  process.exit(0);
}
main();
