import type { Metadata, Viewport } from "next";
import { El_Messiri, Tajawal } from "next/font/google";
import "./globals.css";
import "./faq.css";

const messiri = El_Messiri({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-messiri",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://raheeqkanjo.com"),
  // Google Search Console ownership (zvxa.homam@gmail.com). Removing it un-verifies the site.
  verification: { google: "UN6EU9YCuF45Kpj2Sd3Vro2aae7gJMgE6xJXyAiVmzo" },
  title: "كاتبة محتوى تسويقي للخبراء العرب | رحيق كنجو",
  description:
    "رحيق كنجو، كاتبة محتوى تسويقي للخبراء العرب: أحوّل معرفتك وتجاربك وآراءك إلى محتوى يحمل صوتك على LinkedIn، وفي مقالات موقعك، وفي سكريبتات الفيديو.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName: "رحيق كنجو",
    title: "رحيق كنجو | كاتبة محتوى تسويقي للخبراء العرب",
    description:
      "أعمل مع الخبراء العرب على تحويل معرفتهم وتجاربهم وآرائهم إلى محتوى يحمل صوتهم: على LinkedIn، في مدونات المواقع، وفي سكريبتات الفيديو.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "شعار رحيق كنجو وعبارة: كاتبة محتوى تسويقي مختصة باستراتيجيات المحتوى للخبراء العرب", type: "image/jpeg" }],
  },
  icons: {
    icon: "/icon.svg?v=3",
    apple: "/apple-touch-icon.png?v=3",
  },
  appleWebApp: { title: "رحيق كنجو", capable: false },
  manifest: "/site.webmanifest",
  alternates: { types: { "application/rss+xml": [{ url: "/rss.xml", title: "رحيق كنجو" }] } },
  twitter: {
    card: "summary_large_image",
    title: "رحيق كنجو | كاتبة محتوى تسويقي للخبراء العرب",
    description:
      "أحوّل معرفة الخبراء العرب وتجاربهم إلى محتوى يحمل صوتهم: LinkedIn، مقالات، وسكريبتات فيديو.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "شعار رحيق كنجو وعبارة: كاتبة محتوى تسويقي مختصة باستراتيجيات المحتوى للخبراء العرب", type: "image/jpeg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f2e9",
};


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${messiri.variable} ${tajawal.variable}`}>
      <body>
        <a className="skip-link" href="#main">تخطَّ إلى المحتوى</a>
        {children}
        {/* JSON-LD: each page renders the site graph (lib/jsonld.ts) through <JsonLd />. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script defer src="/track.js" />
        {/* Applies whatever the dashboard has overridden; a no-op with no overrides. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script defer src="/site-content.js" />
      </body>
    </html>
  );
}
