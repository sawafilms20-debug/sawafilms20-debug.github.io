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
  | "faq"
  | "statistics"
  | "media"
  | "enquiries"
  | "newsletter"
  | "analytics"
  | "articleAnalytics"
  | "seo"
  | "siteSettings"
  | "adminUsers"
  | "account"
  | "errorLog";

export type ConfirmFn = (
  message: string,
  opts?: { confirmLabel?: string; danger?: boolean }
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
};

export type Counts = {
  articles: number;
  drafts: number;
  enquiriesAwaiting: number;
  openErrors: number;
};
