import type { Metadata } from "next";
import { pageGraph, toJsonLdString, type PageKey } from "@/lib/jsonld";

/* The page's own metadata is passed in, so the WebPage name and description
   in the markup stay the same as the page's <title> and description. */
function titleOf(meta?: Metadata): string | undefined {
  const t = meta?.title;
  if (!t) return undefined;
  if (typeof t === "string") return t;
  if ("absolute" in t && t.absolute) return t.absolute;
  if ("default" in t && t.default) return t.default;
  return undefined;
}

export default function JsonLd({ page, meta }: { page: PageKey; meta?: Metadata }) {
  const data = pageGraph(page, {
    name: titleOf(meta),
    description: typeof meta?.description === "string" ? meta.description : undefined,
  });
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdString(data) }} />
  );
}
