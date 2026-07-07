import type { Metadata } from "next";
import { Suspense } from "react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import PostView from "./PostView";

export const metadata: Metadata = {
  title: "مقال — رحيق كنجو",
};

export default function PostPage() {
  return (
    <>
      <SiteNav solid />
      <main className="wrap page-head">
        <Suspense fallback={<p className="page-lead">جارٍ التحميل…</p>}>
          <PostView />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
