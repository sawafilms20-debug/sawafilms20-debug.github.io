import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { contentSnapshot } from "@/lib/rpc/routers/pageContent";

/* The overlay file, served live.

   GitHub Pages gets a published copy of this written into docs/ by the publish
   step. The copy served here, from the app's own origin, is generated on the
   spot — so previewing the site on Railway shows what the dashboard holds right
   now, without a publish in between.

   Public on purpose: it contains only text already visible on the website. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = {
  generatedAt: null,
  global: [],
  pages: {},
  testimonials: [],
  processSteps: [],
  services: [],
  faq: [],
  statistics: [],
};

/* One snapshot, reused. Building it costs several full-table reads against a
   small connection pool, and the answer is the same for every visitor — so it
   is computed at most once every CACHE_MS however many people arrive at once. */
const CACHE_MS = 30_000;
let cached: { at: number; body: string } | null = null;
let inFlight: Promise<string> | null = null;

async function snapshotBody(): Promise<string> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.body;
  if (!inFlight) {
    inFlight = contentSnapshot()
      .then((snapshot) => {
        const body = JSON.stringify(snapshot);
        cached = { at: Date.now(), body };
        return body;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export async function GET() {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=30",
    "Access-Control-Allow-Origin": "*",
  };
  if (!hasDb()) return new NextResponse(JSON.stringify(EMPTY), { headers });
  try {
    return new NextResponse(await snapshotBody(), { headers });
  } catch {
    // An unreachable database must not break the page; the site then renders
    // exactly what it was built with.
    return new NextResponse(JSON.stringify(EMPTY), { headers });
  }
}
