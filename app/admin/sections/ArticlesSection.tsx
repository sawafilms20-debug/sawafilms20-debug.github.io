"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SITE_URL } from "../config";
import { rpc, RpcError } from "../rpc";
import { ImageField } from "../MediaPicker";
import {
  BilingualField,
  Dialog,
  EmptyState,
  Field,
  Loading,
  Pagination,
  Segmented,
  Toggle,
  Toolbar,
  formatDate,
  relativeTime,
  slugify,
} from "../ui";
import type { SectionProps } from "../types";

/* The blog: a list of everything written, and one dialog that writes it.

   The list is the fast surface — publish, unpublish, duplicate and delete
   without opening anything. The dialog is the slow one, and it autosaves,
   because losing twenty minutes of writing to a stray Escape is the worst
   thing this dashboard could do to its one operator. */

type StatusFilter = "all" | "published" | "draft" | "scheduled";

type ArticleRow = {
  id: number;
  slug: string;
  titleAr: string;
  titleEn: string | null;
  excerptAr: string | null;
  coverImage: string | null;
  category: string | null;
  tags: string[] | null;
  readingMinutes: number | null;
  status: "draft" | "published";
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ArticleFull = ArticleRow & {
  excerptEn: string | null;
  bodyAr: string;
  bodyEn: string | null;
};

type ListResponse = { items: ArticleRow[]; total: number; page: number; perPage: number };

type Draft = {
  id: number | null;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  bodyAr: string;
  bodyEn: string;
  coverImage: string | null;
  category: string;
  tags: string;
  status: "draft" | "published";
  /** datetime-local text, not ISO — converted on the way out. */
  scheduledAt: string;
};

type SlugState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "free" }
  | { kind: "taken"; reason: string | null };

const PER_PAGE = 20;

const BLANK: Draft = {
  id: null,
  slug: "",
  titleAr: "",
  titleEn: "",
  excerptAr: "",
  excerptEn: "",
  bodyAr: "",
  bodyEn: "",
  coverImage: null,
  category: "",
  tags: "",
  status: "draft",
  scheduledAt: "",
};

const serialize = (d: Draft) => JSON.stringify(d);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseTags(raw: string): string[] {
  const parts = raw
    .split(/[,،]/)
    .map((t) => t.trim().slice(0, 60))
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 20);
}

function draftFromRow(row: ArticleFull): Draft {
  return {
    id: row.id,
    slug: row.slug,
    titleAr: row.titleAr,
    titleEn: row.titleEn ?? "",
    excerptAr: row.excerptAr ?? "",
    excerptEn: row.excerptEn ?? "",
    bodyAr: row.bodyAr ?? "",
    bodyEn: row.bodyEn ?? "",
    coverImage: row.coverImage,
    category: row.category ?? "",
    tags: Array.isArray(row.tags) ? row.tags.join("، ") : "",
    status: row.status === "published" ? "published" : "draft",
    scheduledAt: isoToLocalInput(row.scheduledAt),
  };
}

function payloadOf(d: Draft) {
  return {
    slug: d.slug.trim(),
    titleAr: d.titleAr.trim(),
    titleEn: d.titleEn.trim() || null,
    excerptAr: d.excerptAr.trim() || null,
    excerptEn: d.excerptEn.trim() || null,
    bodyAr: d.bodyAr,
    bodyEn: d.bodyEn.trim() || null,
    coverImage: d.coverImage || null,
    category: d.category.trim() || null,
    tags: parseTags(d.tags),
    status: d.status,
    // Only a draft can be scheduled; publishing now clears any pending date.
    scheduledAt: d.status === "draft" ? localInputToIso(d.scheduledAt) : null,
  };
}

function countWords(text: string): number {
  return text.trim().match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

/** Mirrors the server's own estimate so the two never disagree on a row. */
function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 180));
}

function minutesLabel(n: number): string {
  return n >= 3 && n <= 10 ? `${n} دقائق` : `${n} دقيقة`;
}

/* --------------------------------------------------------------- markdown */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => HTML_ESCAPES[c] ?? c);
}

function safeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|\/|#)/i.test(href);
}

function inlineMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) =>
      safeHref(href) ? `<a href="${href}" target="_blank" rel="noopener">${text}</a>` : text
    );
}

/* Enough markdown to judge a draft by, and no dependency: headings, emphasis,
   links, lists, quotes, paragraphs. Everything is escaped first, so a stray
   angle bracket in the writing shows up as text instead of markup. */
function markdownToHtml(src: string): string {
  const normalized = escapeHtml(src)
    .replace(/\r\n/g, "\n")
    .replace(/^(#{1,4}\s+.*)$/gm, "\n$1\n");

  return normalized
    .split(/\n{2,}/)
    .map((raw) => {
      const block = raw.trim();
      if (!block) return "";

      const heading = /^(#{1,4})\s+(.*)$/.exec(block);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${inlineMd(heading[2])}</h${level}>`;
      }

      const lines = block.split("\n");
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        const li = lines.map((l) => `<li>${inlineMd(l.replace(/^\s*[-*]\s+/, ""))}</li>`).join("");
        return `<ul>${li}</ul>`;
      }
      if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
        const li = lines.map((l) => `<li>${inlineMd(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("");
        return `<ol>${li}</ol>`;
      }
      if (lines.every((l) => /^&gt;\s?/.test(l))) {
        return `<blockquote>${inlineMd(block.replace(/^&gt;\s?/gm, ""))}</blockquote>`;
      }
      return `<p>${inlineMd(lines.join("\n")).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

/* ------------------------------------------------------------------ view */

export default function ArticlesSection({
  toast,
  confirm,
  newNonce,
  onCountsChanged,
}: SectionProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshNonce, setRefreshNonce] = useState(0);

  /* Markdown posts that are live on the site but not yet in the database. On a
     fresh database this is the difference between "you have no articles" and
     "your articles are not here yet", which are very different sentences to
     read while looking at your own blog. */
  const [pendingImport, setPendingImport] = useState<string[]>([]);
  const [importProblem, setImportProblem] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const [items, setItems] = useState<ArticleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (loading || items.length || query || status !== "all") return;
    let cancelled = false;
    rpc.publish
      .pendingImport<{ slugs: string[]; problem: string | null }>()
      .then((r) => {
        if (cancelled) return;
        setPendingImport(r.slugs);
        setImportProblem(r.problem);
      })
      .catch(() => {
        /* the empty state simply stays generic; nothing here is worth an alarm */
      });
    return () => {
      cancelled = true;
    };
  }, [loading, items.length, query, status, refreshNonce]);

  const runImport = async () => {
    setImporting(true);
    try {
      const r = await rpc.publish.importLegacy<{ articles: number; enquiries: number }>();
      toast(`استُوردت ${r.articles} مقالة ✓`);
      setPendingImport([]);
      setRefreshNonce((n) => n + 1);
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر استيراد المقالات.", "bad");
    } finally {
      setImporting(false);
    }
  };

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState("");
  const [savedRow, setSavedRow] = useState<{ slug: string; status: "draft" | "published" } | null>(
    null
  );
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  /* The autosave timer must not restart on every keystroke, so it reads the
     live form through a ref instead of closing over it. */
  const liveRef = useRef<{ draft: Draft | null; baseline: string }>({ draft: null, baseline: "" });
  useEffect(() => {
    liveRef.current = { draft, baseline };
  }, [draft, baseline]);

  const dirty = draft ? serialize(draft) !== baseline : false;

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status, query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setListError("");
    rpc.articles
      .list<ListResponse>({
        status,
        page,
        perPage: PER_PAGE,
        ...(query ? { search: query } : {}),
      })
      .then((r) => {
        if (cancelled) return;
        setItems(Array.isArray(r.items) ? r.items : []);
        setTotal(Number(r.total) || 0);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setListError(e instanceof RpcError ? e.message : "تعذّر تحميل المقالات.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, query, page, refreshNonce]);

  // Keep a selection across in-place row edits, drop ids that left the page.
  useEffect(() => {
    setSelected((prev) => {
      const next = prev.filter((id) => items.some((i) => i.id === id));
      return next.length === prev.length ? prev : next;
    });
  }, [items]);

  useEffect(() => {
    if (!savedAt) {
      setSavedLabel("");
      return;
    }
    const render = () => setSavedLabel(`حُفظ ${relativeTime(savedAt)}`);
    render();
    const t = setInterval(render, 20000);
    return () => clearInterval(t);
  }, [savedAt]);

  const patch = useCallback((p: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }, []);

  const openNew = useCallback(() => {
    setEditorOpen(true);
    setEditorLoading(false);
    setDraft(BLANK);
    setBaseline(serialize(BLANK));
    setSavedRow(null);
    setSlugTouched(false);
    setSlugState({ kind: "idle" });
    setSavedAt(null);
    setShowPreview(false);
  }, []);

  const openArticle = useCallback(
    async (id: number) => {
      setEditorOpen(true);
      setEditorLoading(true);
      setDraft(null);
      setSavedAt(null);
      setShowPreview(false);
      setSlugState({ kind: "idle" });
      try {
        const row = await rpc.articles.get<ArticleFull>({ id });
        const d = draftFromRow(row);
        setDraft(d);
        setBaseline(serialize(d));
        setSavedRow({ slug: row.slug, status: d.status });
        // An existing slug is already hers; retitling must not rewrite a live URL.
        setSlugTouched(true);
      } catch (e) {
        toast(e instanceof RpcError ? e.message : "تعذّر فتح المقال.", "bad");
        setEditorOpen(false);
      } finally {
        setEditorLoading(false);
      }
    },
    [toast]
  );

  // The header's "مقال جديد" button reaches this section only through a nonce.
  const seenNonce = useRef(newNonce);
  useEffect(() => {
    if (newNonce === seenNonce.current) return;
    seenNonce.current = newNonce;
    openNew();
  }, [newNonce, openNew]);

  const closeNow = useCallback(() => {
    setEditorOpen(false);
    setDraft(null);
    setBaseline("");
    setShowPreview(false);
    setSavedAt(null);
  }, []);

  const closeEditor = useCallback(async () => {
    const live = liveRef.current;
    if (live.draft && serialize(live.draft) !== live.baseline) {
      const ok = await confirm("لديك تعديلات لم تُحفظ بعد. هل تغلقين المحرّر وتفقدينها؟", {
        confirmLabel: "أغلقي دون حفظ",
        danger: true,
      });
      if (!ok) return;
    }
    closeNow();
  }, [confirm, closeNow]);

  const persist = useCallback(
    async (mode: "manual" | "auto"): Promise<boolean> => {
      const { draft: d, baseline: b } = liveRef.current;
      if (!d) return false;
      if (mode === "auto") {
        // Creating a row she never named, behind her back, is worse than
        // losing a draft she has not saved once.
        if (d.id === null) return false;
        if (serialize(d) === b) return false;
      }
      if (!d.titleAr.trim()) {
        if (mode === "manual") toast("العنوان بالعربية مطلوب قبل الحفظ.", "bad");
        return false;
      }
      if (!d.slug.trim()) {
        if (mode === "manual") toast("الرابط مطلوب قبل الحفظ.", "bad");
        return false;
      }

      setSaving(true);
      try {
        const payload = payloadOf(d);
        let savedId = d.id;
        if (d.id === null) {
          const row = await rpc.articles.create<ArticleFull>(payload);
          savedId = row.id;
          // The slug is a real URL from this moment on. Editing the title
          // afterwards must not quietly rewrite it out from under the article.
          setSlugTouched(true);
        } else {
          await rpc.articles.update<ArticleFull>({ id: d.id, ...payload });
        }
        const stamped: Draft = { ...d, id: savedId };
        setDraft((cur) => (cur ? { ...cur, id: savedId } : cur));
        setBaseline(serialize(stamped));
        setSavedRow({ slug: payload.slug, status: payload.status });
        setSavedAt(new Date().toISOString());
        setRefreshNonce((n) => n + 1);
        onCountsChanged();
        if (mode === "manual") toast("حُفظ المقال ✓");
        return true;
      } catch (e) {
        toast(e instanceof RpcError ? e.message : "تعذّر حفظ المقال.", "bad");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [toast, onCountsChanged]
  );

  useEffect(() => {
    if (!editorOpen) return;
    const t = setInterval(() => {
      void persist("auto");
    }, 30000);
    return () => clearInterval(t);
  }, [editorOpen, persist]);

  const draftSlug = draft ? draft.slug.trim() : "";
  const draftId = draft ? draft.id : null;
  useEffect(() => {
    if (!editorOpen) return;
    if (!draftSlug) {
      setSlugState({ kind: "idle" });
      return;
    }
    setSlugState({ kind: "checking" });
    let cancelled = false;
    const t = setTimeout(() => {
      rpc.articles
        .slugAvailable<{ available: boolean; reason: string | null }>({
          slug: draftSlug,
          ...(draftId !== null ? { exceptId: draftId } : {}),
        })
        .then((r) => {
          if (cancelled) return;
          setSlugState(r.available ? { kind: "free" } : { kind: "taken", reason: r.reason });
        })
        .catch(() => {
          // A failed check is not an answer; stay quiet and let the save decide.
          if (!cancelled) setSlugState({ kind: "idle" });
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [editorOpen, draftSlug, draftId]);

  const saveAndClose = async () => {
    const ok = await persist("manual");
    if (ok) closeNow();
  };

  const toggleRowStatus = async (row: ArticleRow) => {
    const next = row.status === "published" ? "draft" : "published";
    setBusyId(row.id);
    try {
      const updated = await rpc.articles.update<ArticleFull>({ id: row.id, status: next });
      setItems((list) =>
        list.map((i) =>
          i.id === row.id
            ? {
                ...i,
                status: updated.status,
                publishedAt: updated.publishedAt,
                scheduledAt: updated.scheduledAt,
              }
            : i
        )
      );
      onCountsChanged();
      toast(next === "published" ? "نُشر المقال ✓" : "أصبح المقال مسودة ✓");
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تغيير حالة المقال.", "bad");
    } finally {
      setBusyId(null);
    }
  };

  const duplicateRow = async (row: ArticleRow) => {
    setBusyId(row.id);
    try {
      const copy = await rpc.articles.duplicate<ArticleFull>({ id: row.id });
      toast(`أُنشئت نسخة كمسودة: ${copy.slug} ✓`);
      setRefreshNonce((n) => n + 1);
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر نسخ المقال.", "bad");
    } finally {
      setBusyId(null);
    }
  };

  const deleteRow = async (row: ArticleRow) => {
    const ok = await confirm(`سيُحذف «${row.titleAr}» نهائيًا، ولا يمكن التراجع عن ذلك.`, {
      confirmLabel: "احذفي المقال",
      danger: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      await rpc.articles.delete({ id: row.id });
      toast("حُذف المقال ✓");
      if (items.length === 1 && page > 1) setPage(page - 1);
      else setRefreshNonce((n) => n + 1);
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف المقال.", "bad");
    } finally {
      setBusyId(null);
    }
  };

  const bulkSetStatus = async (next: "draft" | "published") => {
    if (!selected.length) return;
    if (next === "draft") {
      const ok = await confirm(
        `سيُخفى ${selected.length} مقال عن الموقع ويعود مسودة. هل تتابعين؟`,
        { confirmLabel: "حوّليها إلى مسودة", danger: false }
      );
      if (!ok) return;
    }
    try {
      const r = await rpc.articles.bulkStatus<{ updated: number }>({ ids: selected, status: next });
      toast(
        next === "published" ? `نُشر ${r.updated} مقال ✓` : `أصبح ${r.updated} مقال مسودة ✓`
      );
      setSelected([]);
      setRefreshNonce((n) => n + 1);
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر تنفيذ العملية.", "bad");
    }
  };

  const bulkRemove = async () => {
    if (!selected.length) return;
    const ok = await confirm(
      `سيُحذف ${selected.length} مقال نهائيًا، ولا يمكن التراجع عن ذلك.`,
      { confirmLabel: "احذفيها", danger: true }
    );
    if (!ok) return;
    try {
      const r = await rpc.articles.bulkDelete<{ deleted: number }>({ ids: selected });
      toast(`حُذف ${r.deleted} مقال ✓`);
      const remaining = items.length - selected.length;
      setSelected([]);
      if (remaining <= 0 && page > 1) setPage(page - 1);
      else setRefreshNonce((n) => n + 1);
      onCountsChanged();
    } catch (e) {
      toast(e instanceof RpcError ? e.message : "تعذّر حذف المقالات.", "bad");
    }
  };

  const words = useMemo(() => (draft ? countWords(draft.bodyAr) : 0), [draft]);
  const previewHtml = useMemo(
    () => (showPreview && draft ? markdownToHtml(draft.bodyAr) : ""),
    [showPreview, draft]
  );

  const publicUrl = savedRow ? `${SITE_URL}/blog/${savedRow.slug}/` : "";
  const canOpenPublic = savedRow !== null && savedRow.status === "published";

  const onPreview = () => {
    if (!draft) return;
    // A draft has no public page; showing the markdown here beats a 404.
    if (canOpenPublic) window.open(publicUrl, "_blank", "noopener,noreferrer");
    else setShowPreview((v) => !v);
  };

  const allOnPageSelected = items.length > 0 && selected.length === items.length;

  /* `editorLoading` is only ever true while an existing article is on its way
     in, so the dialog header must not flash «مقال جديد» in the meantime. */
  const editingExisting = editorLoading || draft?.id != null;

  return (
    <>
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="بحث بالعنوان أو الرابط…"
      >
        <Segmented<StatusFilter>
          value={status}
          onChange={setStatus}
          ariaLabel="تصفية المقالات بالحالة"
          options={[
            { value: "all", label: "الكل" },
            { value: "published", label: "منشورة" },
            { value: "draft", label: "مسودات" },
            { value: "scheduled", label: "مجدولة" },
          ]}
        />
      </Toolbar>

      {selected.length > 0 && (
        <div className="adm-bulkbar">
          <span>{selected.length} مقال محدَّد</span>
          <button className="adm-link" onClick={() => void bulkSetStatus("published")}>
            نشر
          </button>
          <button className="adm-link" onClick={() => void bulkSetStatus("draft")}>
            تحويل إلى مسودة
          </button>
          <button className="adm-link adm-danger" onClick={() => void bulkRemove()}>
            حذف
          </button>
          <button
            className="adm-link"
            style={{ marginInlineStart: "auto" }}
            onClick={() =>
              setSelected(allOnPageSelected ? [] : items.map((i) => i.id))
            }
          >
            {allOnPageSelected ? "إلغاء التحديد" : "تحديد كل الصفحة"}
          </button>
        </div>
      )}

      {listError && <p className="adm-err" role="alert">{listError}</p>}

      {loading ? (
        <Loading label="جارٍ تحميل المقالات…" />
      ) : listError ? null : items.length === 0 ? (
        query || status !== "all" ? (
          <EmptyState
            title="لا مقال يطابق البحث"
            body="جرّبي كلمة أخرى، أو أعيدي التصفية إلى «الكل» لرؤية كل ما كتبتِه."
            actionLabel="عرض كل المقالات"
            onAction={() => {
              setSearch("");
              setStatus("all");
            }}
          />
        ) : (
          pendingImport.length ? (
            <EmptyState
              title={`${pendingImport.length} مقالات منشورة على موقعك لم تصل إلى اللوحة بعد`}
              body="كُتبت قبل هذه اللوحة، فهي ما زالت ملفات على المستودع وتظهر للزوار كالمعتاد. استوردِيها مرة واحدة لتصبح قابلة للتحرير من هنا."
              actionLabel={importing ? "جارٍ الاستيراد…" : "استوردي المقالات"}
              onAction={importing ? () => {} : runImport}
            />
          ) : (
            <EmptyState
              title="لا توجد مقالات بعد"
              body={
                importProblem
                  ? `هنا تعيش مقالات مدوّنتك. تعذّر التحقق من وجود مقالات قديمة على المستودع (${importProblem})`
                  : "هنا تعيش مقالات مدوّنتك: تكتبينها، تجدولينها، وتنشرينها على الموقع. ابدئي بأول مقال."
              }
              actionLabel="مقال جديد"
              onAction={openNew}
            />
          )
        )
      ) : (
        <div className="adm-list">
          {items.map((row) => {
            const isSelected = selected.includes(row.id);
            const scheduled = row.status !== "published" && !!row.scheduledAt;
            const chip = scheduled
              ? { cls: "scheduled", label: "مجدول" }
              : row.status === "published"
                ? { cls: "published", label: "منشور" }
                : { cls: "draft", label: "مسودة" };
            const when = scheduled
              ? `يُنشر ${formatDate(row.scheduledAt)}`
              : row.status === "published"
                ? `نُشر ${formatDate(row.publishedAt)}`
                : `آخر تعديل ${relativeTime(row.updatedAt)}`;

            return (
              <div className={`adm-item ${isSelected ? "selected" : ""}`} key={row.id}>
                <input
                  type="checkbox"
                  className="adm-checkbox"
                  checked={isSelected}
                  aria-label={`تحديد ${row.titleAr}`}
                  onChange={(e) => {
                    // Read the box now: the updater below runs during a later
                    // render, when the DOM node may already say something else.
                    const on = e.target.checked;
                    setSelected((prev) =>
                      on ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                    );
                  }}
                />
                <div className="adm-item-main">
                  <p className="adm-item-title">{row.titleAr}</p>
                  <p className="adm-item-sub" dir="ltr">
                    /blog/{row.slug}/
                  </p>
                  <div className="adm-item-meta">
                    <span className={`adm-chip ${chip.cls}`}>{chip.label}</span>
                    <span>{when}</span>
                    <span>{minutesLabel(row.readingMinutes ?? 1)} قراءة</span>
                    {row.category && <span>{row.category}</span>}
                  </div>
                </div>
                <div className="adm-item-actions">
                  <Toggle
                    checked={row.status === "published"}
                    disabled={busyId === row.id}
                    label={row.status === "published" ? "إخفاء المقال" : "نشر المقال"}
                    onChange={() => void toggleRowStatus(row)}
                  />
                  <button
                    className="adm-link"
                    disabled={busyId === row.id}
                    onClick={() => void openArticle(row.id)}
                  >
                    تحرير
                  </button>
                  <button
                    className="adm-link"
                    disabled={busyId === row.id}
                    onClick={() => void duplicateRow(row)}
                  >
                    نسخ
                  </button>
                  <button
                    className="adm-link adm-danger"
                    disabled={busyId === row.id}
                    onClick={() => void deleteRow(row)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} perPage={PER_PAGE} total={total} onPage={setPage} />

      <Dialog
        open={editorOpen}
        onClose={() => void closeEditor()}
        width={880}
        title={editingExisting ? "تحرير المقال" : "مقال جديد"}
        subtitle={
          editingExisting
            ? "يُحفظ تلقائيًا كل نصف دقيقة أثناء الكتابة."
            : "لن يُحفظ شيء حتى تضغطي «حفظ»."
        }
        footer={
          <>
            <button
              className="btn btn-gold"
              disabled={saving || editorLoading || !draft}
              onClick={() => void saveAndClose()}
            >
              {saving ? "جارٍ الحفظ…" : "حفظ"}
            </button>
            <button className="btn btn-ghost" disabled={!draft} onClick={onPreview}>
              {canOpenPublic ? "معاينة على الموقع" : showPreview ? "إخفاء المعاينة" : "معاينة"}
            </button>
            <button className="adm-link" onClick={() => void closeEditor()}>
              إلغاء
            </button>
            <span
              className={`adm-saved ${!dirty && savedLabel ? "on" : ""}`}
              style={{ marginInlineStart: "auto" }}
            >
              {dirty ? "تعديلات لم تُحفظ بعد" : savedLabel}
            </span>
          </>
        }
      >
        {editorLoading || !draft ? (
          <Loading label="جارٍ فتح المقال…" />
        ) : (
          <>
            <BilingualField
              label="العنوان"
              required
              valueAr={draft.titleAr}
              valueEn={draft.titleEn}
              onAr={(v) =>
                setDraft((d) =>
                  d ? { ...d, titleAr: v, ...(slugTouched ? {} : { slug: slugify(v) }) } : d
                )
              }
              onEn={(v) => patch({ titleEn: v })}
              placeholder="عنوان المقال كما يظهر على الموقع"
            />

            <Field label="الرابط" required hint={`${SITE_URL}/blog/${draft.slug || "…"}/`}>
              <input
                dir="ltr"
                value={draft.slug}
                placeholder="my-article"
                onChange={(e) => {
                  setSlugTouched(true);
                  patch({ slug: e.target.value });
                }}
              />
            </Field>
            {slugState.kind === "checking" && (
              <small className="adm-field-hint">جارٍ التحقق من الرابط…</small>
            )}
            {slugState.kind === "free" && (
              <small className="adm-field-hint">
                <b className="adm-ok">الرابط متاح ✓</b>
              </small>
            )}
            {slugState.kind === "taken" && (
              <p className="adm-err" role="alert">
                {slugState.reason === "format"
                  ? "الرابط يقبل حروفًا لاتينية صغيرة وأرقامًا وشرطات فقط."
                  : "هذا الرابط مستخدم في مقال آخر."}
              </p>
            )}

            <BilingualField
              label="المقتطف"
              multiline
              rows={3}
              valueAr={draft.excerptAr}
              valueEn={draft.excerptEn}
              onAr={(v) => patch({ excerptAr: v })}
              onEn={(v) => patch({ excerptEn: v })}
              hint="سطران يظهران تحت العنوان في قائمة المدوّنة وفي نتائج البحث."
            />

            <ImageField
              label="صورة الغلاف"
              value={draft.coverImage}
              onChange={(url) => patch({ coverImage: url })}
              onError={(m) => toast(m, "bad")}
              hint="تظهر أعلى المقال وفي بطاقات المشاركة على الشبكات."
            />

            <div className="adm-grid-2">
              <Field label="التصنيف" hint="تصنيف واحد قصير، مثل: التوظيف.">
                <input
                  dir="rtl"
                  value={draft.category}
                  onChange={(e) => patch({ category: e.target.value })}
                />
              </Field>
              <Field label="الوسوم" hint="افصلي بينها بفاصلة — حتى ٢٠ وسمًا.">
                <input
                  dir="rtl"
                  value={draft.tags}
                  placeholder="سيرة ذاتية، مقابلات، لينكدإن"
                  onChange={(e) => patch({ tags: e.target.value })}
                />
              </Field>
            </div>

            <Field
              label="المحتوى"
              hint={`${words} كلمة · ${minutesLabel(readingMinutes(words))} قراءة تقريبًا · تنسيق Markdown`}
            >
              <textarea
                dir="rtl"
                rows={20}
                value={draft.bodyAr}
                placeholder="## عنوان فرعي&#10;&#10;اكتبي هنا…"
                onChange={(e) => patch({ bodyAr: e.target.value })}
              />
            </Field>

            {showPreview && !canOpenPublic && (
              <div
                className="adm-preview-frame"
                dir="rtl"
                style={{ overflowY: "auto", padding: "16px 20px", marginBottom: 16 }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}

            <div className="adm-grid-2">
              <Field label="الحالة">
                <select
                  value={draft.status}
                  onChange={(e) =>
                    patch({ status: e.target.value === "published" ? "published" : "draft" })
                  }
                >
                  <option value="draft">مسودة</option>
                  <option value="published">منشور</option>
                </select>
              </Field>
              <Field
                label="جدولة النشر"
                hint="المقال المجدول ينشر نفسه في هذا الموعد دون تدخّل منك؛ اتركيه فارغًا إن لم ترغبي في الجدولة."
              >
                <input
                  type="datetime-local"
                  dir="ltr"
                  disabled={draft.status === "published"}
                  value={draft.scheduledAt}
                  onChange={(e) => patch({ scheduledAt: e.target.value })}
                />
              </Field>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
