import type { Metadata } from "next";
import { Clapperboard, FileText, Layers, Mail } from "lucide-react";
import FX from "../fx";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ContactForm from "@/components/ContactForm";
import { LinkedInIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "تواصل معي | رحيق كنجو",
  description:
    "لديك فكرة تستحق أن تتحول إلى محتوى؟ احكِ لي عن خبرتك، المشروع والجمهور الذي تريد الوصول إليه.",
  openGraph: {
    type: "website",
    locale: "ar_AR",
    title: "تواصل معي | رحيق كنجو",
    description:
      "لديك فكرة تستحق أن تتحول إلى محتوى؟ احكِ لي عن خبرتك، المشروع والجمهور الذي تريد الوصول إليه.",
    images: ["/og-image.jpg"],
  },
};

export default function ContactPage() {
  return (
    <>
      <SiteNav solid />

      <header className="page-head wrap contact-head">
        <h1 className="hero-title rv d1">لديك فكرة تستحق أن تتحول إلى محتوى؟</h1>
        <p className="page-lead rv d2">يمكن أن تكون:</p>
        <ul className="icon-list cols2 rv d2">
          <li>
            <span className="ic-chip">
              <LinkedInIcon />
            </span>
            حساب LinkedIn
          </li>
          <li>
            <span className="ic-chip">
              <FileText />
            </span>
            فكرة مقال
          </li>
          <li>
            <span className="ic-chip">
              <Clapperboard />
            </span>
            موضوع فيديو
          </li>
          <li>
            <span className="ic-chip">
              <Layers />
            </span>
            أو مجموعة أفكار تحتاج إلى ترتيب
          </li>
        </ul>
        <p className="page-lead strong rv d3">
          احكِ لي عن خبرتك، المشروع والجمهور الذي تريد الوصول إليه
        </p>
      </header>

      <main className="wrap contact-main">
        <ContactForm />
        <div className="contact-alt rv">
          <a href="mailto:raheeqkanjo@gmail.com">
            <span className="ic-inline">
              <Mail />
            </span>
            raheeqkanjo@gmail.com
          </a>
          <a
            href="https://www.linkedin.com/in/raheekkanjo/"
            target="_blank"
            rel="noopener"
          >
            <span className="ic-inline">
              <LinkedInIcon />
            </span>
            أو راسلني على LinkedIn
          </a>
        </div>
      </main>

      <SiteFooter />
      <FX />
    </>
  );
}
