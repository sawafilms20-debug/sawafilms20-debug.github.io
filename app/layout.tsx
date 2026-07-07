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
  title: "رحيق كنجو — شريكة المحتوى للخبراء والشركات",
  description:
    "رحيق كنجو — كاتبة سيناريو وغوست رايتر وخبيرة استراتيجيات المحتوى. أحوّل خبرتك إلى حضور يبني الثقة ويجذب العملاء: نظام محتوى متكامل بصوتك أنت.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    title: "رحيق كنجو — شريكة المحتوى للخبراء والشركات",
    description:
      "نظام محتوى متكامل بصوتك أنت: سيناريو، غوست رايتنغ، واستراتيجية محتوى. أكثر من مليوني مشاهدة و12+ علامة تنمو أسبوعيًا.",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "رحيق كنجو — شريكة المحتوى للخبراء والشركات",
    description:
      "نظام محتوى متكامل بصوتك أنت: سيناريو، غوست رايتنغ، واستراتيجية محتوى.",
    images: ["/og-image.jpg"],
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Raheek Kanjo",
  alternateName: "رحيق كنجو",
  jobTitle: "Senior Content Writer, Ghostwriter & Scriptwriter",
  email: "mailto:raheeqkanjo@gmail.com",
  sameAs: ["https://www.linkedin.com/in/raheekkanjo/"],
  knowsLanguage: ["ar", "en"],
  description:
    "كاتبة سيناريو وغوست رايتر وخبيرة استراتيجيات المحتوى للخبراء والشركات العربية",
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
      </body>
    </html>
  );
}
