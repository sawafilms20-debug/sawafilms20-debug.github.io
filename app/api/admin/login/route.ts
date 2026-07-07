import { NextResponse } from "next/server";
import { COOKIE_NAME, sessionValue } from "@/lib/adminSession";

// Password-based admin login.
//
// Server env vars (Railway → Variables):
//   ADMIN_PASSWORD — the password Raheeq types at /admin
//   GITHUB_TOKEN   — a token with write access to the blog repo
//
// On success we set an HttpOnly session cookie. The GitHub token is NEVER
// sent to the browser — all GitHub calls go through /api/gh/* server-side.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  const token = process.env.GITHUB_TOKEN;

  if (!expected || !token) {
    return NextResponse.json(
      { error: "الخادم غير مهيّأ بعد. اضبطي ADMIN_PASSWORD و GITHUB_TOKEN." },
      { status: 500 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    /* ignore */
  }

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);

  if (!ok) {
    return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, sessionValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
