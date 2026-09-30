/** Dev check: every media row should have a file behind it. */
import { db } from "../lib/db";
import { media } from "../lib/db/schema";
import { get } from "../lib/storage";

async function main() {
  const rows = await db.select().from(media);
  let missing = 0;
  for (const m of rows) {
    if (!(await get(m.storageKey))) {
      missing++;
      console.log(`  missing: ${m.storageKey}`);
    }
  }
  console.log(`${rows.length} media rows · ${missing} missing files`);
  process.exit(missing === 0 ? 0 : 1);
}

main();
