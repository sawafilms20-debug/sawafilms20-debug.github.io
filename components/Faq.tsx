import { FAQ } from "@/lib/faq";

/* Server-rendered FAQ: every question and answer is plain, visible HTML, with
   no client script and no collapsed state, so readers, search engines and AI
   answer engines all see the same text.

   Class names are its own on purpose. The dashboard edits pages by selectors
   such as "section.chapter .ch-title" and ".qa-list .qa", and reusing those
   classes here would make them ambiguous. The look comes from app/faq.css. */
export default function Faq({ page }: { page: string }) {
  const items = FAQ[page];
  if (!items || items.length === 0) return null;
  const headingId = `faq-${page}`;

  return (
    <section className="faq wrap" id="faq" aria-labelledby={headingId}>
      <h2 className="faq-title" id={headingId}>
        أسئلة <em>شائعة</em>
      </h2>
      <div className="faq-list">
        {items.map((item) => (
          <article className="faq-item" key={item.q}>
            <h3 className="faq-q">{item.q}</h3>
            <p className="faq-a">{item.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
