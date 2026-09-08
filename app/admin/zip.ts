"use client";

/* Just enough ZIP to open the file LinkedIn actually sends.
 *
 * The data archive arrives as a zip of forty-odd CSVs, and asking a writer to
 * extract it and find Shares.csv among Connections.csv, Invitations.csv,
 * Ad_Targeting.csv and the rest is a step that will go wrong — especially on a
 * phone, where "unzip and pick one file" is most of an afternoon.
 *
 * So the zip is opened here instead. There is no library: DecompressionStream
 * is native in every browser this dashboard supports, and the central
 * directory is a fixed-layout record that fits in eighty lines. */

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

/** ZIP64 marker: a size that does not fit in 32 bits is stored as all-ones. */
const NEEDS_ZIP64 = 0xffffffff;

export type ZipEntry = {
  name: string;
  /** Read and, where necessary, inflate this entry's bytes. */
  read: () => Promise<Uint8Array>;
};

export function isZip(bytes: Uint8Array): boolean {
  // "PK\x03\x04" — the local file header of the first entry.
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(
    new DecompressionStream("deflate-raw")
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Every file in the archive, without decompressing any of them yet. */
export function readZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  /* The end-of-central-directory record sits at the very end, after a comment
     of unknown length — so it is found by scanning backwards for its
     signature rather than by seeking to a fixed offset. */
  let eocd = -1;
  const floor = Math.max(0, bytes.length - 66_000);
  for (let i = bytes.length - 22; i >= floor; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("هذا الملف ليس أرشيفًا مضغوطًا سليمًا.");

  const count = view.getUint16(eocd + 10, true);
  const dirOffset = view.getUint32(eocd + 16, true);
  if (dirOffset === NEEDS_ZIP64) {
    throw new Error("الأرشيف كبير جدًا (ZIP64). استخرجي Shares.csv وارفعيه وحده.");
  }

  const entries: ZipEntry[] = [];
  let p = dirOffset;

  for (let i = 0; i < count && p + 46 <= bytes.length; i++) {
    if (view.getUint32(p, true) !== CENTRAL_SIG) break;

    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));

    if (compressedSize !== NEEDS_ZIP64 && localOffset !== NEEDS_ZIP64) {
      entries.push({
        name,
        read: async () => {
          /* The local header repeats the name and extra fields, and its own
             lengths are the authoritative ones — the central directory's extra
             field is frequently a different size. Read them here or the data
             starts at the wrong byte. */
          if (view.getUint32(localOffset, true) !== LOCAL_SIG) {
            throw new Error(`تعذّرت قراءة ${name} من الأرشيف.`);
          }
          const lNameLen = view.getUint16(localOffset + 26, true);
          const lExtraLen = view.getUint16(localOffset + 28, true);
          const start = localOffset + 30 + lNameLen + lExtraLen;
          const raw = bytes.subarray(start, start + compressedSize);
          if (method === 0) return raw;
          if (method === 8) return inflateRaw(raw);
          throw new Error(`ضغط غير مدعوم في ${name}.`);
        },
      });
    }
    p += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * The posts file inside a LinkedIn data archive.
 *
 * Matched by name first, since that is what LinkedIn calls it. When the export
 * renames it — it has been renamed before — every CSV is opened and the one
 * whose header names the post text wins. Guessing by position would silently
 * import Connections.csv as a pile of empty posts.
 */
export async function findSharesCsv(bytes: Uint8Array): Promise<string> {
  const entries = readZip(bytes).filter((e) => !e.name.endsWith("/"));
  const base = (n: string) => n.split("/").pop()!.toLowerCase();

  const named = entries.find((e) => base(e.name) === "shares.csv");
  if (named) return new TextDecoder().decode(await named.read());

  for (const e of entries.filter((x) => base(x.name).endsWith(".csv"))) {
    const text = new TextDecoder().decode(await e.read());
    const header = text.slice(0, 400).toLowerCase();
    if (header.includes("sharecommentary") || header.includes("sharelink")) return text;
  }

  throw new Error(
    "لم أجد ملف المنشورات في الأرشيف. تأكدي أنك طلبتِ Posts عند تصدير بياناتك."
  );
}
