import { NextRequest, NextResponse } from "next/server";
import { GH_OWNER, GH_REPO } from "@/app/admin/config";
import { COOKIE_NAME, isValidSession } from "@/lib/adminSession";

// Authenticated GitHub proxy. The browser calls /api/gh/<path> with a valid
// session cookie; the server adds the GITHUB_TOKEN and forwards to the GitHub
// contents API — scoped to this one repo. The token never leaves the server.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "/api/gh/";

async function proxy(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!isValidSession(cookie)) {
    return NextResponse.json({ message: "غير مصرّح" }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ message: "server not configured" }, { status: 500 });
  }

  const path = req.nextUrl.pathname.startsWith(PREFIX)
    ? req.nextUrl.pathname.slice(PREFIX.length)
    : "";
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/${path}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const gh = await fetch(url, init);
  const body = await gh.text();
  return new NextResponse(body, {
    status: gh.status,
    headers: {
      "Content-Type": gh.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
