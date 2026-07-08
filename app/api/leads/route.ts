import { NextResponse } from "next/server";
import { GH_OWNER, GH_REPO, GH_BRANCH } from "@/app/admin/config";

// Public contact-form endpoint. Anyone on the site can POST a message; the
// server (holding GITHUB_TOKEN) appends it to content/leads.json in the repo.
// No auth on POST — but validated, length-capped, honeypot-guarded.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEADS_PATH = "content/leads.json";
const ALLOWED_ORIGINS = [
  "https://raheeqkanjo.com",
  "https://www.raheeqkanjo.com",
  "https://rak-production.up.railway.app",
];

function corsHeaders(origin: string | null) {
  const allow =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

type Lead = {
  id: string;
  name: string;
  email: string;
  message: string;
  source: string;
  date: string;
  read: boolean;
};

const clip = (v: unknown, n: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, n);

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "not configured" }, { status: 500, headers: cors });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400, headers: cors });
  }

  // honeypot: real users never fill "website"
  if (clip(body.website, 100)) {
    return NextResponse.json({ ok: true }, { headers: cors });
  }

  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const message = clip(body.message, 4000);
  const source = clip(body.source, 80) || "contact-form";

  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "الرجاء إدخال الاسم والبريد ورسالة صحيحة." },
      { status: 422, headers: cors }
    );
  }

  const api = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${LEADS_PATH}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  try {
    // read current file (if any)
    let leads: Lead[] = [];
    let sha: string | undefined;
    const cur = await fetch(`${api}?ref=${GH_BRANCH}`, { headers: ghHeaders });
    if (cur.ok) {
      const j = await cur.json();
      sha = j.sha;
      try {
        leads = JSON.parse(Buffer.from(j.content, "base64").toString("utf-8"));
        if (!Array.isArray(leads)) leads = [];
      } catch {
        leads = [];
      }
    }

    const lead: Lead = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      name,
      email,
      message,
      source,
      date: new Date().toISOString(),
      read: false,
    };
    leads.unshift(lead);
    if (leads.length > 1000) leads = leads.slice(0, 1000);

    const put = await fetch(api, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: `New lead from ${name}`,
        content: Buffer.from(JSON.stringify(leads, null, 2)).toString("base64"),
        branch: GH_BRANCH,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!put.ok) {
      const e = await put.json().catch(() => ({}));
      throw new Error(e.message || `GitHub ${put.status}`);
    }
    return NextResponse.json({ ok: true }, { headers: cors });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500, headers: cors }
    );
  }
}
