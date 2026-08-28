import type { Router } from "./core";
import { authRouter } from "./routers/auth";
import { articlesRouter } from "./routers/articles";
import { pageContentRouter } from "./routers/pageContent";
import {
  servicesRouter,
  testimonialsRouter,
  processStepsRouter,
  faqRouter,
  statisticsRouter,
} from "./routers/collections";
import { mediaRouter } from "./routers/media";
import { enquiriesRouter } from "./routers/enquiries";
import { newsletterRouter } from "./routers/newsletter";
import { seoRouter, siteSettingsRouter, adminUsersRouter } from "./routers/settings";
import { analyticsRouter } from "./routers/analytics";
import { errorsRouter } from "./routers/errors";
import { dashboardRouter } from "./routers/dashboard";
import { publishRouter } from "./routers/publish";

export const ROUTERS: Record<string, Router> = {
  auth: authRouter,
  dashboard: dashboardRouter,
  articles: articlesRouter,
  pageContent: pageContentRouter,
  services: servicesRouter,
  testimonials: testimonialsRouter,
  processSteps: processStepsRouter,
  faq: faqRouter,
  statistics: statisticsRouter,
  media: mediaRouter,
  enquiries: enquiriesRouter,
  newsletter: newsletterRouter,
  seo: seoRouter,
  siteSettings: siteSettingsRouter,
  adminUsers: adminUsersRouter,
  analytics: analyticsRouter,
  errors: errorsRouter,
  publish: publishRouter,
};

export type RouterName = keyof typeof ROUTERS;
