import { NextResponse } from "next/server";
import { hasDb, migrate } from "@/lib/db";
import { publicTestimonials } from "@/lib/recommend";

/* The recommendations the home page shows, read live.

   Everything else on the public site changes when she presses publish. These
   do not, on purpose: approving a recommendation someone took the time to
   write should put it on the site, not queue it behind whatever else is
   half-edited in the dashboard. site-content.js asks here first and falls back
   to the published snapshot, then to the HTML, so this being down costs
   nothing but freshness. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=15",
  };
  if (!hasDb()) return NextResponse.json({ testimonials: null }, { headers });
  try {
    await migrate();
    return NextResponse.json({ testimonials: await publicTestimonials() }, { headers });
  } catch {
    return NextResponse.json({ testimonials: null }, { status: 503, headers });
  }
}
