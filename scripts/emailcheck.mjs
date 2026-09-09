/* Checks lib/email.ts against addresses that actually exist.
 *
 * This file exists because a commit message claimed a test had caught a bug
 * in the suggester, and there was no test — the check had been an ad-hoc
 * script run once and thrown away. Two faults were living in it at the time:
 * a real Yahoo domain being "corrected" to Gmail, and a first-letter
 * substitution being treated as a typo.
 *
 * The asymmetry that matters: a FALSE REJECTION is a customer who cannot send
 * a message at all, and a false suggestion is only noise. So the valid list is
 * the one to grow when in doubt.
 *
 *   node scripts/emailcheck.mjs
 * Exit code is non-zero when anything fails. */

import { isValidEmail, suggestEmail } from "../lib/email.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push({ name, error: e.message });
    process.stdout.write(`  FAIL ${name}\n       ${e.message}\n`);
  }
}

/* ------------------------------------------------------------ acceptance */

// Every one of these is deliverable. Refusing any of them loses her a lead.
const VALID = [
  "raheeq@gmail.com",
  "a@b.co",
  "first.last@example.com",
  "user+tag@gmail.com",
  "user+long.tag.here@sub.domain.co.uk",
  "name_1@my-site.io",
  "UPPER@EXAMPLE.COM",
  "x@example.marketing",
  "x@example.consulting",
  "x@studio.agency",
  "hello@raheeqkanjo.com",
  "a@b-c.de",
  "a.b.c@d.e.f.gh",
  "info@xn--mgbh0fb.xn--kgbechtv", // an Arabic IDN in punycode: .مصر
  "info@xn--ngbc5azd.com",         // a punycode label under an ordinary TLD
  "معلومات@شركة.مصر",              // and the same thing before conversion
  "a".repeat(64) + "@example.com",
  "digits123@123domain.com",
  "o'brien@example.com",
  "a@e.software",
];

// None of these can receive mail, and every one of them was reaching the
// inbox before: type="email" does not require a dot in the domain.
const INVALID = [
  "homam@gmail",
  "a@b",
  "no-at-sign",
  "a@@b.com",
  "a b@c.com",
  "a@b..com",
  ".a@b.com",
  "a@b.c",
  "",
  "   ",
  "a@-b.com",
  "a@b.com.",
  "a@.com",
  "@example.com",
  "a@example.",
  "a".repeat(65) + "@example.com",
  "a@" + "b".repeat(250) + ".com",
];

console.log("\nacceptance");
for (const e of VALID) {
  check(`valid: ${e.slice(0, 40)}`, () => {
    if (!isValidEmail(e)) throw new Error("a deliverable address was refused");
  });
}
for (const e of INVALID) {
  check(`invalid: ${JSON.stringify(e).slice(0, 40)}`, () => {
    if (isValidEmail(e)) throw new Error("an undeliverable address was accepted");
  });
}

/* ------------------------------------------------------------ suggestions */

// The typo, and the address it was meant to be.
const TYPOS = [
  ["r@gmial.com", "r@gmail.com"],
  ["r@gmai.com", "r@gmail.com"],
  ["r@gmailcom", "r@gmail.com"],
  ["r@gmaill.com", "r@gmail.com"],
  ["r@hotmial.com", "r@hotmail.com"],
  ["r@hotmai.com", "r@hotmail.com"],
  ["r@outlok.com", "r@outlook.com"],
  ["r@outllok.com", "r@outlook.com"],
  ["r@yahooo.com", "r@yahoo.com"],
  ["r@yaho.com", "r@yahoo.com"],
  ["r@iclod.com", "r@icloud.com"],
];

/* Real, working mail domains. Every one of these was a false suggestion at
   some point, or is one edit from a listed provider and must not be. */
const REAL = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "ymail.com", "rocketmail.com", "email.com", "mailo.com", "foxmail.com",
  "protonmail.ch", "protonmail.com", "proton.me", "pm.me",
  "mail.ru", "yandex.ru", "inbox.ru", "list.ru", "bk.ru",
  "qq.com", "163.com", "126.com", "sina.com", "aliyun.com",
  "gmx.de", "gmx.net", "gmx.at", "web.de", "t-online.de", "posteo.de",
  "free.fr", "orange.fr", "laposte.net", "libero.it", "virgilio.it",
  "seznam.cz", "wp.pl", "o2.pl", "interia.pl",
  "naver.com", "daum.net", "hanmail.net", "nate.com",
  "zoho.eu", "zoho.com", "fastmail.com", "hey.com", "tutanota.com",
  "aol.com", "msn.com", "live.com", "live.co.uk", "yahoo.co.uk", "yahoo.fr",
  "googlemail.com", "me.com", "mac.com", "comcast.net", "verizon.net",
  "sbcglobal.net", "cox.net", "btinternet.com", "sky.com", "telus.net",
  "raheeqkanjo.com", "exeedin.com", "mycompany.com", "some-agency.marketing",
];

console.log("\nsuggestions");
for (const [typo, want] of TYPOS) {
  check(`catches ${typo}`, () => {
    const got = suggestEmail(typo);
    if (got !== want) throw new Error(`expected ${want}, got ${got ?? "no suggestion"}`);
  });
}
for (const d of REAL) {
  check(`quiet on ${d}`, () => {
    const got = suggestEmail(`a@${d}`);
    if (got) throw new Error(`suggested ${got} for a real domain`);
  });
}

check("a suggestion never changes the local part", () => {
  const got = suggestEmail("first.last+tag@gmial.com");
  if (got !== "first.last+tag@gmail.com") throw new Error(`got ${got}`);
});

check("nothing is suggested for an address with no @", () => {
  if (suggestEmail("gmial.com") !== null) throw new Error("suggested for a bare domain");
});

/* ----------------------------------------------------------------- report */

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
  process.exit(1);
}
console.log("email validation verified against real addresses.\n");
