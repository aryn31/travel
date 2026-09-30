import Link from "next/link";
import { flagFor } from "@/components/ui/PlaceMark";

function countryName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ??
      code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

const CHIP_TINTS = [
  "border-[#2f6f6b]/35 bg-[#2f6f6b]/12 text-[#2f6f6b] dark:border-[#7ab9ad]/30 dark:bg-[#7ab9ad]/12 dark:text-[#7ab9ad]",
  "border-[#b4511f]/35 bg-[#b4511f]/12 text-[#b4511f] dark:border-[#e2864f]/30 dark:bg-[#e2864f]/12 dark:text-[#e2864f]",
  "border-[#5c6b3f]/35 bg-[#5c6b3f]/12 text-[#5c6b3f] dark:border-[#a3b878]/30 dark:bg-[#a3b878]/12 dark:text-[#a3b878]",
  "border-[#4a5f86]/35 bg-[#4a5f86]/12 text-[#4a5f86] dark:border-[#8fa8d4]/30 dark:bg-[#8fa8d4]/12 dark:text-[#8fa8d4]",
  "border-[#8a4a6a]/35 bg-[#8a4a6a]/12 text-[#8a4a6a] dark:border-[#cf8fb0]/30 dark:bg-[#cf8fb0]/12 dark:text-[#cf8fb0]",
  "border-[#96652f]/35 bg-[#96652f]/12 text-[#96652f] dark:border-[#d6a463]/30 dark:bg-[#d6a463]/12 dark:text-[#d6a463]",
];

function tintFor(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) | 0;
  return CHIP_TINTS[Math.abs(hash) % CHIP_TINTS.length];
}

type Destination = { code: string; count: number };

function Chips({ destinations }: { destinations: Destination[] }) {
  return (
    <ul className="flex shrink-0 items-center gap-3 pr-3">
      {destinations.map((d) => (
        <li key={d.code}>
          <Link
            href={`/?country=${d.code}`}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5 ${tintFor(d.code)}`}
          >
            <span aria-hidden className="text-base leading-none">
              {flagFor(d.code) ?? "📍"}
            </span>
            <span className="whitespace-nowrap">{countryName(d.code)}</span>
            <span className="tabular-nums opacity-60">{d.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Countries people have written about, on a loop.
 *
 * The list is rendered twice: the animation slides the track by half its
 * width, so as the first copy leaves the second is exactly in position and
 * the seam never shows. The duplicate is hidden from assistive tech.
 */
export function DestinationTicker({
  destinations,
}: {
  destinations: Destination[];
}) {
  if (destinations.length === 0) return null;

  return (
    <div className="marquee-mask -mx-6 overflow-hidden lg:-mx-10">
      <div className="marquee">
        <Chips destinations={destinations} />
        <div aria-hidden>
          <Chips destinations={destinations} />
        </div>
      </div>
    </div>
  );
}
