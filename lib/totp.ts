import crypto from "crypto";

/* RFC 6238 TOTP, on node's crypto. No dependency: the whole algorithm is an
   HMAC over a counter plus a truncation. */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function randomBase32(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpCode(secret: string, at: number = Date.now(), stepSec = 30): string {
  const counter = Math.floor(at / 1000 / stepSec);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

/** Accepts the current step plus one either side, for clock drift. */
export function totpVerify(secret: string, code: string, at: number = Date.now()): boolean {
  const given = (code || "").replace(/\D/g, "");
  if (given.length !== 6) return false;
  for (const drift of [-1, 0, 1]) {
    const expected = totpCode(secret, at + drift * 30_000);
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, account: string, issuer = "رحيق كنجو") {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    account
  )}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
