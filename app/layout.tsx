import type { Metadata } from "next";
import { El_Messiri, Tajawal } from "next/font/google";
import "./globals.css";

const messiri = El_Messiri({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-messiri",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://raheeqkanjo.com"),
  title: "رحيق كنجو | كاتبة محتوى تسويقي للخبراء العرب",
  description:
    "رحيق كنجو كاتبة محتوى تسويقي أعمل مع الخبراء العرب على تحويل معرفتهم وتجاربهم وآرائهم إلى محتوى يحمل صوتهم: على LinkedIn، في مدونات المواقع، وفي سكريبتات الفيديو.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    title: "رحيق كنجو | كاتبة محتوى تسويقي للخبراء العرب",
    description:
      "أعمل مع الخبراء العرب على تحويل معرفتهم وتجاربهم وآرائهم إلى محتوى يحمل صوتهم: على LinkedIn، في مدونات المواقع، وفي سكريبتات الفيديو.",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "رحيق كنجو | كاتبة محتوى تسويقي للخبراء العرب",
    description:
      "أحوّل معرفة الخبراء العرب وتجاربهم إلى محتوى يحمل صوتهم: LinkedIn، مقالات، وسكريبتات فيديو.",
    images: ["/og-image.jpg"],
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Raheek Kanjo",
  alternateName: "رحيق كنجو",
  jobTitle: "Marketing Content Writer & Content Strategist",
  email: "mailto:raheeqkanjo@gmail.com",
  sameAs: ["https://www.linkedin.com/in/raheekkanjo/"],
  knowsLanguage: ["ar", "en"],
  description:
    "كاتبة واستراتيجية محتوى للخبراء العرب: محتوى LinkedIn، مقالات المواقع، وسكريبتات الفيديو",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${messiri.variable} ${tajawal.variable}`}>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script defer src="/track.js" />
      </body>
    </html>
  );
}
