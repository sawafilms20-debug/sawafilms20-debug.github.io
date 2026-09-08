/* The contract between the dashboard shell and every section.

   One shape for all of them, so a section can be added, moved between groups
   or removed without touching anything but the navigation table. */

export type SectionId =
  | "dashboard"
  | "articles"
  | "pageText"
  | "services"
  | "testimonials"
  | "processSteps"
  | "media"
  | "enquiries"
  | "newsletter"
  | "seo"
  | "siteSettings"
  | "account"
  /* Reachable from the quick search and nowhere else: an error log is for
     whoever maintains the site, not for whoever writes it. */
  | "errorLog";

export type ConfirmFn = (
  message: string,
  opts?: { confirmLabel?: string; cancelLabel?: string; danger?: boolean }
) => Promise<boolean>;

export type SectionProps = {
  /** Show a transient message. `bad` renders as an error and does not auto-dismiss. */
  toast: (message: string, kind?: "ok" | "bad") => void;
  confirm: ConfirmFn;
  goTo: (section: SectionId) => void;
  /** Bumped when the header's "new" button is pressed, so a section can open
   *  its editor without the shell knowing what that editor is. */
  newNonce: number;
  /** Ask the shell to refresh sidebar badges after a write. */
  onCountsChanged: () => void;
  role: "owner" | "editor";
  /** What the URL asked for, read once on load — e.g. "linkedin-paste" from
   *  /admin#linkedin-paste, the bookmark that lands straight in the paste box. */
  intent?: string | null;
};

export type Counts = {
  articles: number;
  drafts: number;
  enquiriesAwaiting: number;
  openErrors: number;
};
