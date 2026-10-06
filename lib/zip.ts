import "server-only";

/**
 * A minimal ZIP writer, streaming, stored (uncompressed) entries only.
 *
 * Written here rather than pulled in because the job is narrow: the
 * archive holds photographs, which are already JPEG or WebP, so deflating
 * them would spend CPU to make them very slightly larger. "Stored" is the
 * right method and it is the simplest half of the format.
 *
 * Streamed rather than assembled in memory: somebody with three hundred
 * photographs would otherwise have the whole archive held in the server's
 * heap before a byte reached them.
 *
 * Not ZIP64. That matters above 4GB in total or per file, which a
 * personal archive of photographs does not reach -- the upload limit
 * makes a single file far smaller, and `addFile` refuses anything that
 * would overflow rather than writing a corrupt header.
 */

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
/** Bit 11: the name is UTF-8 rather than the format's ancient default. */
const UTF8_FLAG = 0x800;
const MAX_ZIP32 = 0xffffffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** MS-DOS packed date and time, which is what the format stores. */
function dosStamp(date: Date): { time: number; date: number } {
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (Math.floor(date.getSeconds() / 2) & 0x1f),
    date:
      ((date.getFullYear() - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

type Entry = {
  name: Buffer;
  crc: number;
  size: number;
  offset: number;
  time: number;
  date: number;
};

export type ZipFile = {
  /** Path inside the archive. Forward slashes, no leading one. */
  name: string;
  body: Uint8Array;
  modified?: Date;
};

/**
 * Builds the archive as a stream.
 *
 * `files` is an async iterable so a caller can fetch each photograph as
 * it is needed rather than downloading all of them first.
 */
export function zipStream(
  files: AsyncIterable<ZipFile>,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const entries: Entry[] = [];
      let offset = 0;

      const push = (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
        offset += chunk.length;
      };

      try {
        for await (const file of files) {
          const name = Buffer.from(file.name, "utf8");
          const body = file.body;

          if (body.length > MAX_ZIP32 || offset + body.length > MAX_ZIP32) {
            // Refusing beats writing a header that lies about the size.
            throw new Error("Archive too large for ZIP32");
          }

          const { time, date } = dosStamp(file.modified ?? new Date());
          const crc = crc32(body);
          const start = offset;

          const header = Buffer.alloc(30);
          header.writeUInt32LE(LOCAL_SIG, 0);
          header.writeUInt16LE(20, 4); // version needed
          header.writeUInt16LE(UTF8_FLAG, 6);
          header.writeUInt16LE(0, 8); // stored
          header.writeUInt16LE(time, 10);
          header.writeUInt16LE(date, 12);
          header.writeUInt32LE(crc, 14);
          header.writeUInt32LE(body.length, 18); // compressed
          header.writeUInt32LE(body.length, 22); // uncompressed
          header.writeUInt16LE(name.length, 26);
          header.writeUInt16LE(0, 28); // no extra field

          push(header);
          push(name);
          push(Buffer.from(body));

          entries.push({ name, crc, size: body.length, offset: start, time, date });
        }

        const centralStart = offset;
        for (const e of entries) {
          const record = Buffer.alloc(46);
          record.writeUInt32LE(CENTRAL_SIG, 0);
          record.writeUInt16LE(20, 4); // version made by
          record.writeUInt16LE(20, 6); // version needed
          record.writeUInt16LE(UTF8_FLAG, 8);
          record.writeUInt16LE(0, 10); // stored
          record.writeUInt16LE(e.time, 12);
          record.writeUInt16LE(e.date, 14);
          record.writeUInt32LE(e.crc, 16);
          record.writeUInt32LE(e.size, 20);
          record.writeUInt32LE(e.size, 24);
          record.writeUInt16LE(e.name.length, 28);
          record.writeUInt16LE(0, 30); // extra
          record.writeUInt16LE(0, 32); // comment
          record.writeUInt16LE(0, 34); // disk
          record.writeUInt16LE(0, 36); // internal attrs
          record.writeUInt32LE(0, 38); // external attrs
          record.writeUInt32LE(e.offset, 42);

          push(record);
          push(e.name);
        }

        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(EOCD_SIG, 0);
        eocd.writeUInt16LE(0, 4); // this disk
        eocd.writeUInt16LE(0, 6); // disk with central directory
        eocd.writeUInt16LE(entries.length, 8);
        eocd.writeUInt16LE(entries.length, 10);
        eocd.writeUInt32LE(offset - centralStart, 12);
        eocd.writeUInt32LE(centralStart, 16);
        eocd.writeUInt16LE(0, 20); // no comment
        push(eocd);

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
