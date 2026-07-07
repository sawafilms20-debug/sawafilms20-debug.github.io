export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        رحيق كنجو © {new Date().getFullYear()} · كُتب هذا الموقع <b>بحبرٍ ذهبي</b> وشغفٍ
        بالحكاية.
        <div className="foot-links">
          <a
            href="https://www.linkedin.com/in/raheekkanjo/"
            target="_blank"
            rel="noopener"
          >
            لينكدإن
          </a>
          <a href="mailto:raheeqkanjo@gmail.com">raheeqkanjo@gmail.com</a>
        </div>
      </div>
    </footer>
  );
}
