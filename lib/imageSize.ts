/* Intrinsic dimensions straight from the file header.

   Reading these needs a few dozen bytes, not an image-processing library:
   `sharp` is a native binary that has to build on the deploy host, and the only
   thing wanted here is width and height for the media library. */

export type Dim = { width: number; height: number } | null;

export function imageSize(buf: Buffer, mime: string): Dim {
  try {
    if (mime === "image/png") return png(buf);
    if (mime === "image/jpeg") return jpeg(buf);
    if (mime === "image/gif") return gif(buf);
    if (mime === "image/webp") return webp(buf);
    if (mime === "image/avif") return avif(buf);
  } catch {
    /* a malformed header is not worth failing an upload over */
  }
  return null;
}

function png(b: Buffer): Dim {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gif(b: Buffer): Dim {
  if (b.length < 10 || b.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function jpeg(b: Buffer): Dim {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    // SOF0..SOF15, skipping the four that are not frame headers
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const len = b.readUInt16BE(i + 2);
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

function webp(b: Buffer): Dim {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP")
    return null;
  const fourcc = b.toString("ascii", 12, 16);
  if (fourcc === "VP8 ") {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (fourcc === "VP8X") {
    const w = b[24] | (b[25] << 8) | (b[26] << 16);
    const h = b[27] | (b[28] << 8) | (b[29] << 16);
    return { width: w + 1, height: h + 1 };
  }
  return null;
}

function avif(b: Buffer): Dim {
  // ispe box: 'ispe', version+flags (4 bytes), then width and height
  const idx = b.indexOf("ispe", 0, "ascii");
  if (idx < 0 || idx + 16 > b.length) return null;
  return { width: b.readUInt32BE(idx + 8), height: b.readUInt32BE(idx + 12) };
}
