import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidSession } from "@/lib/adminSession";
import { hasDb, ensureSchema, q } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES: Record<string, string | null> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  all: null,
};

export async function GET(req: NextRequest) {
  if (!isValidSession(req.cookies.get(COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasDb()) {
    return NextResponse.json({ connected: false });
  }

  const rangeKey = req.nextUrl.searchParams.get("range") || "30d";
  const interval = RANGES[rangeKey] ?? "30 days";
  const where = interval ? `ts > now() - interval '${interval}'` : "TRUE";

  try {
    await ensureSchema();
    const [
      totals,
      series,
      pages,
      referrers,
      devices,
      browsers,
      locations,
      events,
      utm,
      sessions,
    ] = await Promise.all([
      q(`SELECT
           count(*) FILTER (WHERE type='pageview') AS page_views,
           count(DISTINCT visitor_id) AS visitors,
           count(DISTINCT session_id) AS sessions,
           count(*) FILTER (WHERE type='event') AS events
         FROM events WHERE ${where}`),
      q(`SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS d, count(*) FILTER (WHERE type='pageview') AS n
         FROM events WHERE ${where} GROUP BY 1 ORDER BY 1`),
      q(`SELECT coalesce(path,'/') AS k, count(*) AS n FROM events
         WHERE ${where} AND type='pageview' GROUP BY 1 ORDER BY n DESC LIMIT 12`),
      q(`SELECT referrer_host AS k, count(*) AS n FROM events
         WHERE ${where} AND referrer_host IS NOT NULL AND referrer_host<>'' GROUP BY 1 ORDER BY n DESC LIMIT 8`),
      q(`SELECT coalesce(device,'unknown') AS k, count(DISTINCT session_id) AS n FROM events
         WHERE ${where} GROUP BY 1 ORDER BY n DESC`),
      q(`SELECT coalesce(browser,'Other') AS k, count(DISTINCT session_id) AS n FROM events
         WHERE ${where} GROUP BY 1 ORDER BY n DESC LIMIT 8`),
      q(`SELECT trim(both ', ' from concat_ws(', ', nullif(city,''), country)) AS k, count(DISTINCT visitor_id) AS n
         FROM events WHERE ${where} AND country IS NOT NULL AND country<>'Unknown' GROUP BY 1 ORDER BY n DESC LIMIT 8`),
      q(`SELECT event_name AS k, count(*) AS n FROM events
         WHERE ${where} AND type='event' AND event_name IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT 12`),
      q(`SELECT utm_source AS k, count(*) AS n FROM events
         WHERE ${where} AND utm_source IS NOT NULL AND utm_source<>'' GROUP BY 1 ORDER BY n DESC LIMIT 8`),
      q(`SELECT session_id,
           max(device) AS device, max(browser) AS browser,
           trim(both ', ' from concat_ws(', ', nullif(max(city),''), max(country))) AS location,
           (array_agg(path ORDER BY ts) FILTER (WHERE type='pageview'))[1] AS first_path,
           count(*) FILTER (WHERE type='pageview') AS pages,
           to_char(max(ts),'YYYY-MM-DD HH24:MI') AS last_ts
         FROM events WHERE ${where} GROUP BY session_id ORDER BY max(ts) DESC LIMIT 15`),
    ]);

    return NextResponse.json({
      connected: true,
      range: rangeKey,
      totals: totals[0] || {},
      series,
      pages,
      referrers,
      devices,
      browsers,
      locations,
      events,
      utm,
      sessions,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { connected: true, error: e instanceof Error ? e.message : "query failed" },
      { status: 500 }
    );
  }
}
