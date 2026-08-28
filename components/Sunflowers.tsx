/* Decorative only: رحيق is nectar, so the flowers belong to the name.
   Purely ornamental, so it is hidden from assistive tech and never interactive. */

const PETALS = Array.from({ length: 12 }, (_, i) => i * 30);

function Sunflower({ cls }: { cls: string }) {
  return (
    <svg className={`sf ${cls}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g className="sf-petals">
        {PETALS.map((deg) => (
          <ellipse key={deg} cx="12" cy="5.7" rx="1.7" ry="4" transform={`rotate(${deg} 12 12)`} />
        ))}
      </g>
      <circle className="sf-eye" cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export default function Sunflowers() {
  return (
    <div className="sunflowers" aria-hidden="true">
      {["sf-1", "sf-2", "sf-3", "sf-4", "sf-5", "sf-6"].map((c) => (
        <Sunflower key={c} cls={c} />
      ))}
    </div>
  );
}
