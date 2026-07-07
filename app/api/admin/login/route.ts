import { NextResponse } from "next/server";

// Password-based admin login.
//
// Set two environment variables on the server (Railway → Variables):
//   ADMIN_PASSWORD  — the memorable password Raheeq types at /admin
//   GITHUB_TOKEN    — a GitHub fine-grained token with Contents: Read & write
//                     on sawafilms20-debug/sawafilms20-debug.github.io
//
// The GitHub token never ships in the built site — it lives only on the
// server and is handed to the browser only after the correct password.

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

  // constant-time-ish comparison
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);

  if (!ok) {
    return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  }

  return NextResponse.json({ token });
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
