import { deflateSync } from "node:zlib";

/**
 * Generates placeholder landscape photos for the seed. Same midpoint-
 * displacement idea as the hero, rasterised: sky gradient, sun, a few ridges
 * and a water band. It isn't photography, but it gives each story a distinct,
 * plausible image without downloading anything.
 */

type RGB = [number, number, number];

// 4x4 Bayer matrix, centred on zero and scaled to a couple of levels.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v / 15 - 0.5) * 4,
);

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ridge(rand: () => number, base: number, amp: number, steps = 6): number[] {
  let pts = [base + (rand() - 0.5) * amp, base + (rand() - 0.5) * amp];
  let a = amp;
  for (let s = 0; s < steps; s++) {
    const next: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(pts[i], (pts[i] + pts[i + 1]) / 2 + (rand() - 0.5) * a);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    a *= 0.58;
  }
  return pts;
}

function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export type Palette = {
  skyTop: RGB;
  skyLow: RGB;
  sun: RGB;
  ridges: RGB[];
  water: RGB;
};

export function landscapePng(
  width: number,
  height: number,
  seed: number,
  palette: Palette,
): Buffer {
  const rand = mulberry32(seed);
  const horizon = Math.round(height * (0.6 + rand() * 0.12));

  const layers = palette.ridges.map((colour, i) => {
    const base = horizon - (palette.ridges.length - i) * height * 0.07;
    const pts = ridge(rand, base, height * (0.16 - i * 0.025));
    return { colour, pts };
  });

  const sunX = Math.round(width * (0.15 + rand() * 0.7));
  const sunY = Math.round(horizon * (0.25 + rand() * 0.35));
  const sunR = Math.round(height * 0.045);

  const at = (pts: number[], x: number) => {
    const f = (x / (width - 1)) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f));
    return pts[i] + (pts[i + 1] - pts[i]) * (f - i);
  };

  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;

  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // PNG filter: none
    for (let x = 0; x < width; x++) {
      let c: RGB;

      if (y < horizon) {
        c = lerp(palette.skyTop, palette.skyLow, y / horizon);

        const d = Math.hypot(x - sunX, y - sunY);
        if (d < sunR) c = palette.sun;
        else if (d < sunR * 7) {
          c = lerp(c, palette.sun, Math.pow(1 - (d - sunR) / (sunR * 6), 2.2) * 0.75);
        }

        for (let i = 0; i < layers.length; i++) {
          if (y > at(layers[i].pts, x)) {
            // Slight vertical shading so a range isn't a flat cut-out.
            const depth = (y - at(layers[i].pts, x)) / height;
            c = lerp(layers[i].colour, [0, 0, 0], Math.min(0.25, depth * 0.5));
          }
        }
      } else {
        // Water: the sky inverted, banded, and progressively calmer.
        const t = (y - horizon) / (height - horizon);
        c = lerp(palette.water, palette.skyLow, Math.max(0, 0.35 - t * 0.35));
        const band = Math.sin((y - horizon) * 0.55 + Math.sin(x * 0.012) * 1.6);
        c = lerp(c, palette.sun, Math.max(0, band) * 0.06 * (1 - t));
      }

      // Ordered dither, not random grain. Per-pixel noise is incompressible:
      // it took these PNGs to ~1.5MB each, where real uploads land near 40KB.
      // A tiling 4x4 pattern breaks up banding and deflates almost for free.
      const grain = BAYER[(y & 3) * 4 + (x & 3)];
      raw[p++] = Math.max(0, Math.min(255, Math.round(c[0] + grain)));
      raw[p++] = Math.max(0, Math.min(255, Math.round(c[1] + grain)));
      raw[p++] = Math.max(0, Math.min(255, Math.round(c[2] + grain)));
    }
  }

  const chunk = (tag: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(tag, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

let table: number[] | null = null;
function crc32(buf: Buffer): number {
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return crc ^ 0xffffffff;
}
