/* Dashboard icons. Stroke icons on a 24-grid, sized by the caller through CSS,
   so a single set works in the sidebar, in buttons and inside table rows. */

type P = { className?: string };

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg {...base} className={className}>
    {children}
  </svg>
);

export const IconDashboard = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Svg>
);

export const IconArticles = (p: P) => (
  <Svg {...p}>
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2z" />
    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    <path d="M9 13h7M9 17h7" />
  </Svg>
);

export const IconPages = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <path d="M3 9h18M9 9v12" />
  </Svg>
);

export const IconServices = (p: P) => (
  <Svg {...p}>
    <path d="M12 2 3 7l9 5 9-5z" />
    <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
  </Svg>
);

export const IconTestimonials = (p: P) => (
  <Svg {...p}>
    <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM8 5V3M5 8H3" />
    <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h1" />
  </Svg>
);

export const IconSteps = (p: P) => (
  <Svg {...p}>
    <circle cx="5" cy="6" r="2" />
    <circle cx="5" cy="18" r="2" />
    <path d="M5 8v8M10 6h9M10 18h9M10 12h6" />
  </Svg>
);

export const IconFaq = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.2 9a3 3 0 0 1 5.6 1c0 2-2.8 2.6-2.8 4" />
    <path d="M12 17h.01" />
  </Svg>
);

export const IconStats = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Svg>
);

export const IconMedia = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <circle cx="8.5" cy="8.5" r="1.6" />
    <path d="m21 15-4.5-4.5L6 21" />
  </Svg>
);

export const IconLeads = (p: P) => (
  <Svg {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2.5" />
    <path d="m22 7-8.97 5.7a2 2 0 0 1-2.06 0L2 7" />
  </Svg>
);

export const IconNewsletter = (p: P) => (
  <Svg {...p}>
    <path d="M4 4h16v12H8l-4 4z" />
    <path d="M8 9h8M8 12h5" />
  </Svg>
);

export const IconAnalytics = (p: P) => (
  <Svg {...p}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="m7 15 4-5 3 3 4-6" />
  </Svg>
);

export const IconSeo = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);

export const IconSettings = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

export const IconUsers = (p: P) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </Svg>
);

export const IconBug = (p: P) => (
  <Svg {...p}>
    <rect x="8" y="6" width="8" height="14" rx="4" />
    <path d="M19 9h-3M8 9H5M19 14h-3M8 14H5M19 19h-3M8 19H5M9 6 8 3M15 6l1-3" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);

export const IconDrag = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="6" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="18" r="1" />
  </Svg>
);

export const IconChevron = ({ dir = "next", className }: P & { dir?: "next" | "prev" }) => (
  <Svg className={className}>
    <path d={dir === "next" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
  </Svg>
);

export const IconView = (p: P) => (
  <Svg {...p}>
    <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const IconEye = IconView;

export const IconEyeOff = (p: P) => (
  <Svg {...p}>
    <path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c5 0 9 4 10 7a13 13 0 0 1-2.2 3.2M6.6 6.6A13 13 0 0 0 2 12c1 3 5 7 10 7a10.9 10.9 0 0 0 4.2-.8" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
  </Svg>
);

export const IconPublish = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
    <path d="M4 21h16" />
  </Svg>
);

export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </Svg>
);

export const IconExport = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v12M8 11l4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Svg>
);

export const IconCommand = (p: P) => (
  <Svg {...p}>
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 0 0 0-6z" />
  </Svg>
);

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </Svg>
);

export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 13 4 4L19 7" />
  </Svg>
);

/* Still imported by the dashboard, the blog editor, leads and projects.
   Kept in the same 24-grid stroke style as the set above. */

export const IconBlog = (p: P) => (
  <Svg {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M9 7h7M9 11h5" />
  </Svg>
);

export const IconProjects = (p: P) => (
  <Svg {...p}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M2 13h20" />
  </Svg>
);

export const IconImage = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <circle cx="8.8" cy="9" r="1.6" />
    <path d="m21 15-4.5-4.5L6 21" />
  </Svg>
);

export const IconRefresh = (p: P) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </Svg>
);

export const IconReply = (p: P) => (
  <Svg {...p}>
    <path d="M9 17 4 12l5-5" />
    <path d="M4 12h10a6 6 0 0 1 6 6v2" />
  </Svg>
);
