import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { COOKIE_NAME, isValidSession } from "@/lib/adminSession";
import { GH_OWNER, GH_REPO, GH_BRANCH } from "@/app/admin/config";
import {
  type Post,
  type Shell,
  renderPostPage,
  renderBlogIndex,
  renderSitemap,
  renderRss,
  ROBOTS,
} from "@/lib/siteGen";

// Regenerates the public blog as real, crawlable static pages:
//   docs/blog/<slug>/index.html   (unique title/description/OG/JSON-LD + article text)
//   docs/blog/index.html          (static, crawlable list)
//   docs/sitemap.xml, docs/rss.xml, docs/robots.txt
// Everything is written in ONE commit via the Git Data API.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`;
const RAW = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}`;

function gh(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { message?: string }).message || `GitHub ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* Reuse the built site's stylesheet + font-variable classes so generated pages match. */
async function readShell(): Promise<Shell> {
  const r = await fetch(`${RAW}/docs/index.html`, { cache: "no-store" });
  const html = r.ok ? await r.text() : "";
  const css = html.match(/<link rel="stylesheet" href="([^"]+\.css)"/)?.[1];
  const cls = html.match(/<html[^>]*class="([^"]*)"/)?.[1];
  return {
    cssHref: css || "/_next/static/css/ae743f717ea69337.css",
    htmlClass: cls || "",
  };
}

async function loadPosts(token: string): Promise<Post[]> {
  const list = await json<{ name: string; path: string }[]>(
    await fetch(`${API}/contents/content/blog?ref=${GH_BRANCH}`, { headers: gh(token) })
  );
  const files = list.filter(
    (f) => f.name.endsWith(".md") && f.name.toLowerCase() !== "readme.md"
  );
  const posts = await Promise.all(
    files.map(async (f) => {
      const raw = await fetch(`${RAW}/${f.path}`, { cache: "no-store" }).then((r) => r.text());
      const { data, content } = matter(raw);
      const d = data as Record<string, unknown>;
      return {
        slug: f.name.replace(/\.md$/, ""),
        title: String(d.title || f.name),
        date: String(d.date || ""),
        lang: d.lang === "en" ? ("en" as const) : ("ar" as const),
        excerpt: String(d.excerpt || ""),
        tags: Array.isArray(d.tags) ? (d.tags as string[]).map(String) : [],
        cover: d.cover ? String(d.cover) : undefined,
        status: String(d.status || "published"),
        body: content.trim(),
      } satisfies Post;
    })
  );
  return posts
    .filter((p) => p.status !== "draft")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* existing generated post dirs, so removed posts get their page deleted */
async function existingPostPages(token: string): Promise<string[]> {
  const r = await fetch(`${API}/contents/docs/blog?ref=${GH_BRANCH}`, { headers: gh(token) });
  if (!r.ok) return [];
  const items = (await r.json()) as { name: string; type: string }[];
  return items.filter((i) => i.type === "dir" && i.name !== "p").map((i) => i.name);
}

export async function POST(req: NextRequest) {
  if (!isValidSession(req.cookies.get(COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) return NextResponse.json({ error: "not configured" }, { status: 500 });

  try {
    const [posts, shell, existing] = await Promise.all([
      loadPosts(token),
      readShell(),
      existingPostPages(token),
    ]);

    type Entry = {
      path: string;
      mode: "100644";
      type: "blob";
      content?: string;
      sha?: null;
    };
    const tree: Entry[] = [];

    for (const p of posts) {
      tree.push({
        path: `docs/blog/${p.slug}/index.html`,
        mode: "100644",
        type: "blob",
        content: renderPostPage(p, shell),
      });
    }
    // delete pages whose post no longer exists (or became a draft)
    const slugs = new Set(posts.map((p) => p.slug));
    for (const old of existing) {
      if (!slugs.has(old)) {
        tree.push({ path: `docs/blog/${old}/index.html`, mode: "100644", type: "blob", sha: null });
      }
    }

    tree.push({ path: "docs/blog/index.html", mode: "100644", type: "blob", content: renderBlogIndex(posts, shell) });
    tree.push({ path: "docs/sitemap.xml", mode: "100644", type: "blob", content: renderSitemap(posts) });
    tree.push({ path: "docs/rss.xml", mode: "100644", type: "blob", content: renderRss(posts) });
    tree.push({ path: "docs/robots.txt", mode: "100644", type: "blob", content: ROBOTS });

    // inspect what would be written, without touching the repo
    if (req.nextUrl.searchParams.get("dry")) {
      const samplePath = tree.find(
        (t) => t.path.startsWith("docs/blog/") && t.path !== "docs/blog/index.html" && t.content
      );
      return NextResponse.json({
        dry: true,
        posts: posts.length,
        shell,
        files: tree.map((t) => ({
          path: t.path,
          bytes: t.content ? t.content.length : 0,
          deleted: t.sha === null,
        })),
        samplePath: samplePath?.path,
        sample: samplePath?.content?.slice(0, 1400),
      });
    }

    // one commit for everything
    const ref = await json<{ object: { sha: string } }>(
      await fetch(`${API}/git/ref/heads/${GH_BRANCH}`, { headers: gh(token) })
    );
    const parent = ref.object.sha;
    const commit = await json<{ tree: { sha: string } }>(
      await fetch(`${API}/git/commits/${parent}`, { headers: gh(token) })
    );
    const newTree = await json<{ sha: string }>(
      await fetch(`${API}/git/trees`, {
        method: "POST",
        headers: gh(token),
        body: JSON.stringify({ base_tree: commit.tree.sha, tree }),
      })
    );
    const newCommit = await json<{ sha: string }>(
      await fetch(`${API}/git/commits`, {
        method: "POST",
        headers: gh(token),
        body: JSON.stringify({
          message: `Publish: regenerate ${posts.length} blog page(s), sitemap, RSS`,
          tree: newTree.sha,
          parents: [parent],
        }),
      })
    );
    await json(
      await fetch(`${API}/git/refs/heads/${GH_BRANCH}`, {
        method: "PATCH",
        headers: gh(token),
        body: JSON.stringify({ sha: newCommit.sha }),
      })
    );

    return NextResponse.json({ ok: true, posts: posts.length, commit: newCommit.sha });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "publish failed" },
      { status: 500 }
    );
  }
}
