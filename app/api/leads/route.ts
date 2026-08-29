import { NextResponse } from "next/server";
import { GH_OWNER, GH_REPO, GH_BRANCH } from "@/app/admin/config";
import { dbq, hasDb, migrate } from "@/lib/db";
import { clientIp, publicCorsHeaders as corsHeaders } from "@/lib/net";
import { rateLimit } from "@/lib/rateLimit";
import { recordError } from "@/lib/errorLog";

/* The public contact endpoint.

   Kept at this path because the deployed static site's contact.js and the blog
   subscribe form already post here; the storage behind it moved to Postgres.

   Anyone on the internet can call this, so: every field is length-capped, the
   honeypot is checked first, and the rate limit is keyed on the caller's
   address as our own edge reported it — never on the submitted email, which
   the caller chooses and can vary at will. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEADS_PATH = "content/leads.json";
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

/* Postgres refuses a text value containing a NUL byte, so one in the message
   would otherwise be a guaranteed 500 from an anonymous caller. */
const clip = (v: unknown, n: number) =>
  (typeof v === "string" ? v : "").replace(/\u0000/g, "").trim().slice(0, n);

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const ip = clientIp(req);

  if (!rateLimit(`lead:${ip}`, MAX_PER_WINDOW, WINDOW_MS).ok) {
    return NextResponse.json(
      { error: "الرجاء المحاولة بعد قليل." },
      { status: 429, headers: cors }
    );
  }

  if (Number(req.headers.get("content-length") || 0) > 64_000) {
    return NextResponse.json({ error: "الرسالة طويلة جدًا." }, { status: 413, headers: cors });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400, headers: cors });
  }

  // Honeypot: a real person never fills a field they cannot see. Answer 200 so
  // a bot learns nothing from the response.
  if (clip(body.website, 100)) {
    return NextResponse.json({ ok: true }, { headers: cors });
  }

  const name = clip(body.name, 200);
  const email = clip(body.email, 320);
  const message = clip(body.message, 4000);
  const source = clip(body.source, 100) || "contact-form";
  const phone = clip(body.phone, 50) || null;
  const serviceInterest = clip(body.serviceInterest, 100) || null;
  const utmSource = clip(body.utm_source, 100) || null;
  const utmCampaign = clip(body.utm_campaign, 100) || null;

  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "الرجاء إدخال الاسم والبريد ورسالة صحيحة." },
      { status: 422, headers: cors }
    );
  }

  if (hasDb()) {
    try {
      await migrate();
      const isSubscribe = source === "blog-subscribe";
      if (isSubscribe) {
        // A public form must not be able to undo someone's unsubscribe. Once a
        // person has opted out, only the operator can put them back — anyone on
        // the internet could otherwise re-subscribe an address they do not own.
        await dbq(
          `INSERT INTO newsletter_subscribers (email, name, source, "confirmedAt")
           VALUES ($1,$2,$3, now())
           ON CONFLICT (email) DO UPDATE
             SET "isActive" = TRUE
           WHERE newsletter_subscribers."unsubscribedAt" IS NULL`,
          [email, name || null, source]
        );
      } else {
        await dbq(
          `INSERT INTO enquiries
             (name, email, phone, "serviceInterest", message, source, "utmSource", "utmCampaign")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [name, email, phone, serviceInterest, message, source, utmSource, utmCampaign]
        );
      }
      return NextResponse.json({ ok: true }, { headers: cors });
    } catch (e) {
      // The caller is anonymous: a driver error names the host and the schema.
      await recordError(
        e instanceof Error ? e.message : "lead insert failed",
        e instanceof Error ? e.stack : undefined,
        "/api/leads"
      );
      return NextResponse.json(
        { error: "تعذّر إرسال الرسالة. حاول مرة أخرى." },
        { status: 500, headers: cors }
      );
    }
  }

  // No database attached yet: fall back to the JSON file in the repository, so
  // a message is never simply dropped on the floor.
  return githubFallback({ name, email, message, source }, cors);
}

type LegacyLead = {
  id: string;
  name: string;
  email: string;
  message: string;
  source: string;
  date: string;
  read: boolean;
};

async function githubFallback(
  input: { name: string; email: string; message: string; source: string },
  cors: Record<string, string>
) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "not configured" }, { status: 500, headers: cors });
  }
  const api = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${LEADS_PATH}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
  const lead: LegacyLead = {
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    ...input,
    date: new Date().toISOString(),
    read: false,
  };

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      let leads: LegacyLead[] = [];
      let sha: string | undefined;
      const cur = await fetch(`${api}?ref=${GH_BRANCH}`, { headers });
      if (cur.ok) {
        const j = await cur.json();
        sha = j.sha;
        try {
          const parsed = JSON.parse(Buffer.from(j.content, "base64").toString("utf-8"));
          if (Array.isArray(parsed)) leads = parsed;
        } catch {
          leads = [];
        }
      }
      leads.unshift(lead);
      if (leads.length > 1000) leads = leads.slice(0, 1000);

      const put = await fetch(api, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `New lead from ${input.name}`,
          content: Buffer.from(JSON.stringify(leads, null, 2)).toString("base64"),
          branch: GH_BRANCH,
          ...(sha ? { sha } : {}),
        }),
      });
      if (put.ok) return NextResponse.json({ ok: true }, { headers: cors });
      if (put.status === 409 || put.status === 422) continue; // sha conflict — retry
      const e = await put.json().catch(() => ({}));
      throw new Error((e as { message?: string }).message || `GitHub ${put.status}`);
    } catch (e) {
      if (attempt === 3) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "failed" },
          { status: 500, headers: cors }
        );
      }
    }
  }
  return NextResponse.json({ error: "conflict" }, { status: 503, headers: cors });
}
