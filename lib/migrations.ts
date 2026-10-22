/* Ordered, append-only migrations.

   Two rules, both learned expensively elsewhere:

   1. These run from application startup, not from a hand-run command. A
      migration journal that only advances when a human remembers to advance it
      drifts, and the drift is discovered on the login path at 2am.
   2. Never edit a migration that has shipped. Add a new one. The runner records
      every applied id and skips it forever after.

   Postgres, with camelCase identifiers quoted so rows come back from `pg` with
   exactly the keys the TypeScript types declare — no mapping layer. */

export type Migration = { id: string; sql: string };

export const MIGRATIONS: Migration[] = [
  {
    id: "001_updated_at_trigger",
    sql: `
      CREATE OR REPLACE FUNCTION rk_set_updated_at() RETURNS trigger AS $$
      BEGIN
        NEW."updatedAt" = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `,
  },

  {
    id: "002_admin_users_sessions",
    sql: `
      CREATE TABLE IF NOT EXISTS admin_users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(320) NOT NULL UNIQUE,
        "passwordHash" VARCHAR(255) NOT NULL,
        name          VARCHAR(255) NOT NULL,
        role          VARCHAR(16) NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor')),
        "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
        "totpSecret"  VARCHAR(64),
        "lastLoginAt" TIMESTAMPTZ,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      DROP TRIGGER IF EXISTS trg_admin_users_updated ON admin_users;
      CREATE TRIGGER trg_admin_users_updated BEFORE UPDATE ON admin_users
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();

      -- Sessions live in the database, never in process memory. A deploy must
      -- not sign the operator out while her cookie still looks valid.
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token       VARCHAR(64) PRIMARY KEY,
        "adminId"   INT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions("adminId");
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions("expiresAt");
    `,
  },

  {
    id: "003_articles",
    sql: `
      CREATE TABLE IF NOT EXISTS articles (
        id               SERIAL PRIMARY KEY,
        slug             VARCHAR(255) NOT NULL UNIQUE,
        "titleAr"        VARCHAR(500) NOT NULL,
        "titleEn"        VARCHAR(500),
        "excerptAr"      TEXT,
        "excerptEn"      TEXT,
        "bodyAr"         TEXT NOT NULL DEFAULT '',
        "bodyEn"         TEXT,
        "coverImage"     VARCHAR(500),
        category         VARCHAR(100),
        tags             JSONB NOT NULL DEFAULT '[]'::jsonb,
        "readingMinutes" INT,
        status           VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
        "publishedAt"    TIMESTAMPTZ,
        "scheduledAt"    TIMESTAMPTZ,
        "authorId"       INT REFERENCES admin_users(id) ON DELETE SET NULL,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status, "publishedAt");
      CREATE INDEX IF NOT EXISTS idx_articles_scheduled ON articles("scheduledAt");
      DROP TRIGGER IF EXISTS trg_articles_updated ON articles;
      CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON articles
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();
    `,
  },

  {
    id: "004_page_content",
    sql: `
      -- Every editable string on the public site. A missing row is not an
      -- error: the site falls back to its hard-coded default, so the operator
      -- only ever overrides what she actually wants to change.
      CREATE TABLE IF NOT EXISTS page_content (
        id            SERIAL PRIMARY KEY,
        "pageKey"     VARCHAR(100) NOT NULL,
        "sectionKey"  VARCHAR(100) NOT NULL,
        "contentKey"  VARCHAR(100) NOT NULL,
        "valueAr"     TEXT,
        "valueEn"     TEXT,
        "contentType" VARCHAR(16) NOT NULL DEFAULT 'text'
                      CHECK ("contentType" IN ('text','richtext','image','url')),
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("pageKey","sectionKey","contentKey")
      );
      DROP TRIGGER IF EXISTS trg_page_content_updated ON page_content;
      CREATE TRIGGER trg_page_content_updated BEFORE UPDATE ON page_content
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();
    `,
  },

  {
    id: "005_services",
    sql: `
      CREATE TABLE IF NOT EXISTS services (
        id             SERIAL PRIMARY KEY,
        slug           VARCHAR(100) NOT NULL UNIQUE,
        "titleAr"      VARCHAR(255) NOT NULL,
        "titleEn"      VARCHAR(255),
        "summaryAr"    TEXT,
        "summaryEn"    TEXT,
        "bodyAr"       TEXT,
        "bodyEn"       TEXT,
        icon           VARCHAR(100),
        "coverImage"   VARCHAR(500),
        "priceNote"    VARCHAR(255),
        "displayOrder" INT NOT NULL DEFAULT 0,
        "isActive"     BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      DROP TRIGGER IF EXISTS trg_services_updated ON services;
      CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();
    `,
  },

  {
    id: "006_testimonials",
    sql: `
      CREATE TABLE IF NOT EXISTS testimonials (
        id              SERIAL PRIMARY KEY,
        "quoteAr"       TEXT NOT NULL,
        "quoteEn"       TEXT,
        "authorName"    VARCHAR(255) NOT NULL,
        "authorTitleAr" VARCHAR(255),
        "authorTitleEn" VARCHAR(255),
        company         VARCHAR(255),
        "authorPhoto"   VARCHAR(500),
        "sourceUrl"     VARCHAR(500),
        "displayOrder"  INT NOT NULL DEFAULT 0,
        "isVisible"     BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      DROP TRIGGER IF EXISTS trg_testimonials_updated ON testimonials;
      CREATE TRIGGER trg_testimonials_updated BEFORE UPDATE ON testimonials
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();
    `,
  },

  {
    id: "007_process_steps",
    sql: `
      CREATE TABLE IF NOT EXISTS process_steps (
        id              SERIAL PRIMARY KEY,
        "stepNumber"    INT NOT NULL DEFAULT 1,
        "titleAr"       VARCHAR(255) NOT NULL,
        "titleEn"       VARCHAR(255),
        "descriptionAr" TEXT,
        "descriptionEn" TEXT,
        icon            VARCHAR(100),
        "displayOrder"  INT NOT NULL DEFAULT 0,
        "isVisible"     BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      DROP TRIGGER IF EXISTS trg_process_steps_updated ON process_steps;
      CREATE TRIGGER trg_process_steps_updated BEFORE UPDATE ON process_steps
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();
    `,
  },

  {
    id: "008_faq_and_statistics",
    sql: `
      CREATE TABLE IF NOT EXISTS faq_items (
        id             SERIAL PRIMARY KEY,
        "questionAr"   TEXT NOT NULL,
        "questionEn"   TEXT,
        "answerAr"     TEXT NOT NULL,
        "answerEn"     TEXT,
        category       VARCHAR(100),
        "displayOrder" INT NOT NULL DEFAULT 0,
        "isVisible"    BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      DROP TRIGGER IF EXISTS trg_faq_items_updated ON faq_items;
      CREATE TRIGGER trg_faq_items_updated BEFORE UPDATE ON faq_items
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();

      CREATE TABLE IF NOT EXISTS statistics (
        id             SERIAL PRIMARY KEY,
        "labelAr"      VARCHAR(255) NOT NULL,
        "labelEn"      VARCHAR(255),
        value          VARCHAR(50) NOT NULL,
        suffix         VARCHAR(20),
        icon           VARCHAR(100),
        "displayOrder" INT NOT NULL DEFAULT 0,
        "isVisible"    BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      DROP TRIGGER IF EXISTS trg_statistics_updated ON statistics;
      CREATE TRIGGER trg_statistics_updated BEFORE UPDATE ON statistics
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();
    `,
  },

  {
    id: "009_enquiries",
    sql: `
      -- status + private notes are the difference between an inbox and a
      -- pipeline: read/archived alone cannot say whether a message was answered.
      CREATE TABLE IF NOT EXISTS enquiries (
        id                SERIAL PRIMARY KEY,
        name              VARCHAR(200) NOT NULL,
        email             VARCHAR(320) NOT NULL,
        phone             VARCHAR(50),
        "serviceInterest" VARCHAR(100),
        message           TEXT NOT NULL,
        source            VARCHAR(100),
        "utmSource"       VARCHAR(100),
        "utmCampaign"     VARCHAR(100),
        status            VARCHAR(16) NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new','read','replied','archived')),
        notes             TEXT,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status, "createdAt");
      DROP TRIGGER IF EXISTS trg_enquiries_updated ON enquiries;
      CREATE TRIGGER trg_enquiries_updated BEFORE UPDATE ON enquiries
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();
    `,
  },

  {
    id: "010_newsletter",
    sql: `
      -- Unsubscribes keep their row. A resubscribe must not look like a new
      -- signup, and consent history has to be provable.
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id               SERIAL PRIMARY KEY,
        email            VARCHAR(320) NOT NULL UNIQUE,
        name             VARCHAR(255),
        "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
        source           VARCHAR(100),
        "confirmedAt"    TIMESTAMPTZ,
        "unsubscribedAt" TIMESTAMPTZ,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  },

  {
    id: "011_seo_and_site_settings",
    sql: `
      CREATE TABLE IF NOT EXISTS seo_settings (
        id                  SERIAL PRIMARY KEY,
        "pageKey"           VARCHAR(100) NOT NULL UNIQUE,
        "metaTitleAr"       VARCHAR(200),
        "metaTitleEn"       VARCHAR(200),
        "metaDescriptionAr" TEXT,
        "metaDescriptionEn" TEXT,
        "ogImage"           VARCHAR(500),
        "noIndex"           BOOLEAN NOT NULL DEFAULT FALSE,
        "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      DROP TRIGGER IF EXISTS trg_seo_settings_updated ON seo_settings;
      CREATE TRIGGER trg_seo_settings_updated BEFORE UPDATE ON seo_settings
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();

      CREATE TABLE IF NOT EXISTS site_settings (
        id             SERIAL PRIMARY KEY,
        "settingKey"   VARCHAR(100) NOT NULL UNIQUE,
        "settingValue" TEXT,
        "settingType"  VARCHAR(16) NOT NULL DEFAULT 'text'
                       CHECK ("settingType" IN ('text','image','color','url','json')),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      DROP TRIGGER IF EXISTS trg_site_settings_updated ON site_settings;
      CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON site_settings
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();
    `,
  },

  {
    id: "012_media",
    sql: `
      -- Every key lives under one prefix and the serving route refuses anything
      -- outside it, so a bad write cannot produce a file that uploads fine and
      -- then 404s from every URL.
      CREATE TABLE IF NOT EXISTS media_assets (
        id           SERIAL PRIMARY KEY,
        "storageKey" VARCHAR(500) NOT NULL UNIQUE,
        url          VARCHAR(500) NOT NULL,
        "fileName"   VARCHAR(255) NOT NULL,
        "mimeType"   VARCHAR(100) NOT NULL,
        "sizeBytes"  INT NOT NULL,
        width        INT,
        height       INT,
        "altAr"      VARCHAR(500),
        "altEn"      VARCHAR(500),
        "uploadedBy" INT REFERENCES admin_users(id) ON DELETE SET NULL,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT media_key_prefix CHECK ("storageKey" LIKE 'uploads/%')
      );

      -- Bytes live beside the metadata. Railway's filesystem is ephemeral and
      -- there is no object store wired up; one row per file keeps uploads
      -- durable across deploys without adding a second service to operate.
      CREATE TABLE IF NOT EXISTS media_blobs (
        "storageKey" VARCHAR(500) PRIMARY KEY
                     REFERENCES media_assets("storageKey") ON DELETE CASCADE,
        bytes        BYTEA NOT NULL
      );
    `,
  },

  {
    id: "013_error_logs",
    sql: `
      -- Deduplicated by fingerprint. One broken page otherwise writes thousands
      -- of identical rows and the log becomes unreadable exactly when needed.
      CREATE TABLE IF NOT EXISTS error_logs (
        id            SERIAL PRIMARY KEY,
        fingerprint   VARCHAR(64) NOT NULL UNIQUE,
        message       TEXT NOT NULL,
        stack         TEXT,
        path          VARCHAR(500),
        "userAgent"   VARCHAR(500),
        hits          INT NOT NULL DEFAULT 1,
        "isResolved"  BOOLEAN NOT NULL DEFAULT FALSE,
        "firstSeenAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "lastSeenAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_error_logs_open ON error_logs("isResolved","lastSeenAt");
    `,
  },

  {
    id: "014_analytics_events",
    sql: `
      -- Analytics keeps the single denormalised 'events' table this site has
      -- been collecting into since launch, rather than splitting it into
      -- page_views/events/sessions and abandoning the existing rows. Every
      -- field the split design needed is already here; 'type' discriminates.
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        ts TIMESTAMPTZ NOT NULL DEFAULT now(),
        session_id TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        type TEXT NOT NULL,
        path TEXT,
        referrer_host TEXT,
        device TEXT,
        browser TEXT,
        os TEXT,
        country TEXT,
        city TEXT,
        event_name TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        duration INT
      );
      CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
      CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_path_ts ON events(path, ts);

      -- event_data carries the shape of an interaction, never who performed it.
      ALTER TABLE events ADD COLUMN IF NOT EXISTS event_data JSONB;
    `,
  },

  {
    id: "015_linkedin_posts",
    sql: `
      -- LinkedIn posts waiting to become articles.
      --
      -- Kept apart from the articles table on purpose: a row here is raw
      -- material, not a draft. It has no slug, no status the site
      -- understands and no place in the blog index, and it must be possible
      -- to dismiss one without leaving a half-written article behind.
      -- Converting copies it into articles and records which it became.
      CREATE TABLE IF NOT EXISTS linkedin_posts (
        id            SERIAL PRIMARY KEY,
        -- The permalink where there is one, otherwise a hash of the text. The
        -- unique constraint is what makes re-uploading the whole archive, or
        -- pasting the same post twice, a no-op instead of a duplicate.
        "externalId"  VARCHAR(255) NOT NULL UNIQUE,
        "postUrl"     VARCHAR(500),
        "postedAt"    TIMESTAMPTZ,
        text          TEXT NOT NULL,
        "sharedUrl"   VARCHAR(500),
        "mediaUrl"    VARCHAR(500),
        visibility    VARCHAR(32),
        source        VARCHAR(16) NOT NULL DEFAULT 'paste'
                        CHECK (source IN ('paste','archive')),
        status        VARCHAR(16) NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','converted','dismissed')),
        -- SET NULL, not CASCADE: deleting the article she made from a post must
        -- not delete the post it came from.
        "articleId"   INT REFERENCES articles(id) ON DELETE SET NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_linkedin_status
        ON linkedin_posts(status, "postedAt" DESC NULLS LAST);

      DROP TRIGGER IF EXISTS trg_linkedin_posts_updated ON linkedin_posts;
      CREATE TRIGGER trg_linkedin_posts_updated BEFORE UPDATE ON linkedin_posts
        FOR EACH ROW EXECUTE FUNCTION rk_set_updated_at();
    `,
  },

  {
    id: "016_linkedin_archive",
    sql: `
      -- Putting a post away, without deleting it.
      --
      -- Until now the only way to clear a row off the list was to delete it,
      -- which also throws away the record that stops the same post arriving
      -- twice. Archiving is orthogonal to status on purpose: a post that has
      -- already become an article still wants filing away when she is done
      -- with it, and 'dismissed' would be the wrong word for that.
      ALTER TABLE linkedin_posts ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMPTZ;

      -- Rows dismissed before this column existed were archived by another
      -- name; give them a date so they appear where they now belong.
      UPDATE linkedin_posts
         SET "archivedAt" = "updatedAt"
       WHERE status = 'dismissed' AND "archivedAt" IS NULL;

      CREATE INDEX IF NOT EXISTS idx_linkedin_archived
        ON linkedin_posts("archivedAt");
    `,
  },
  {
    id: "017_testimonial_submissions",
    sql: `
      -- Recommendations people write themselves, through a link she sends them.
      --
      -- They land in the same table as the ones she types in, because once
      -- approved they ARE the same thing: an ordered, visible-or-not quote on
      -- the home page. What is different is only that a stranger wrote the
      -- row, so it waits for her before it can be seen.
      ALTER TABLE testimonials
        ADD COLUMN IF NOT EXISTS "pendingReview"  BOOLEAN NOT NULL DEFAULT FALSE,
        -- Never published. It is how she thanks them, or checks it was them.
        ADD COLUMN IF NOT EXISTS "submitterEmail" VARCHAR(320),
        ADD COLUMN IF NOT EXISTS "submittedAt"    TIMESTAMPTZ,
        -- The photo they uploaded, so refusing a submission can delete it too
        -- rather than leave a stranger's face in her media library.
        ADD COLUMN IF NOT EXISTS "submittedPhotoKey" VARCHAR(500);

      CREATE INDEX IF NOT EXISTS idx_testimonials_pending
        ON testimonials("pendingReview") WHERE "pendingReview";

      -- The six recommendations the home page has always shown live in its
      -- HTML, not here. The page swaps that HTML for the database list as soon
      -- as the list has anything in it — so the first approved submission would
      -- otherwise replace all six with one. Bring them in first, unless she has
      -- already put her own list together.
      INSERT INTO testimonials
        ("quoteAr","authorName","authorTitleAr",company,"authorPhoto","displayOrder","isVisible")
      SELECT v.q, v.n, v.t, v.c, v.p, v.o, TRUE
        FROM (VALUES
          ('تستمع جيدًا وتحاول أن تفهم الشخص وطريقة تفكيره قبل أن تبدأ بالعمل، وتحافظ على صوته وأسلوبه بدل أن تفرض عليه أسلوبًا جاهزًا.',
           'Fouad Hasan', 'CFO', NULL, '/avatar-fouad.jpg', 0),
          ('باحثة ممتازة. تطرح الأسئلة الصحيحة، وتلتقط التفاصيل المهمة، ثم تقدّم حلولًا مدروسة تعكس صوت الحساب وشخصيته بصدق.',
           'أسماء الخالدي', 'مستشارة LinkedIn للخبراء العرب', NULL, '/avatar-asmaa.jpg', 1),
          ('تملك حسًا واضحًا في فهم العلامة وصوتها، وهو ما يظهر بصورة خاصة في كتابتها للعلامات الشخصية.',
           'Rami Badrah', 'Marketing Content & UX Consultant', NULL, '/avatar-rami.jpg', 2),
          ('إتقان. احترام وتقدير. تواجد دائمًا. إبداع بالبحث والكتابة. رحيق إضافة لا أندم عليها أبدًا لفريق EXEED.',
           'Mohamad Jandali', 'CEO', 'exeedin.com', '/avatar-jandali.jpg', 3),
          ('Well organized, result oriented and creative copywriter. I really recommend Raheek to be a cornerstone of any copywriting team.',
           'Mohammed Okko', 'CEO & Founder', 'Digital Genuity', '/avatar-okko.jpg', 4),
          ('استشارة تسويقية مركزة وقوية لبناء علامتي الشخصية وهوية حساب الشركة، مع استراتيجيات واضحة لزيادة المتابعين واستقطاب الجمهور. المعلومات جاءت عميقة وعملية.',
           'Ali Hasan', 'OT/ICS Security Engineer', NULL, '/avatar-ali.jpg', 5)
        ) AS v(q, n, t, c, p, o)
       WHERE NOT EXISTS (SELECT 1 FROM testimonials WHERE "isVisible")
         AND NOT EXISTS (SELECT 1 FROM testimonials t WHERE t."authorName" = v.n);
    `,
  },
  {
    id: "018_recommendations_via_enquiries",
    sql: `
      -- The recommendation page went live while the platform the dashboard
      -- runs on had paused every deploy, so the server that receives
      -- recommendations directly did not exist yet. The page sends through the
      -- contact endpoint instead, marked source = 'recommendation', and this
      -- trigger files each one where it belongs: a hidden draft in the
      -- recommendations list, never a message. RETURN NULL drops the enquiry
      -- row; the endpoint still answers success.
      --
      -- The form sends the bare recommendation as the message, the position
      -- as serviceInterest and the LinkedIn profile link as utm_source — the
      -- only free fields that endpoint has.
      CREATE OR REPLACE FUNCTION rk_recommendation_from_enquiry() RETURNS trigger AS $$
      BEGIN
        INSERT INTO testimonials
          ("quoteAr","authorName","authorTitleAr","sourceUrl","displayOrder","isVisible",
           "pendingReview","submitterEmail","submittedAt")
        VALUES
          (NEW.message, NEW.name, NULLIF(NEW."serviceInterest", ''), NULLIF(NEW."utmSource", ''),
           (SELECT COALESCE(max("displayOrder"), -1) + 1 FROM testimonials),
           FALSE, TRUE, NEW.email, now());
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_enquiry_recommendation ON enquiries;
      CREATE TRIGGER trg_enquiry_recommendation BEFORE INSERT ON enquiries
        FOR EACH ROW WHEN (NEW.source = 'recommendation')
        EXECUTE FUNCTION rk_recommendation_from_enquiry();

      -- Any that arrived as messages before the trigger existed. The first
      -- version of the page wrote the details into the message above a blank
      -- line, under the heading «توصية للموقع»; only those get the header cut.
      INSERT INTO testimonials
        ("quoteAr","authorName","authorTitleAr","sourceUrl","displayOrder","isVisible",
         "pendingReview","submitterEmail","submittedAt")
      SELECT CASE WHEN e.message LIKE 'توصية للموقع%' AND strpos(e.message, E'\\n\\n') > 0
                  THEN substr(e.message, strpos(e.message, E'\\n\\n') + 2)
                  ELSE e.message END,
             e.name,
             NULLIF(e."serviceInterest", ''),
             COALESCE(substring(e.message from 'LinkedIn: ([^\\n]+)'), NULLIF(e."utmSource", '')),
             (SELECT COALESCE(max("displayOrder"), -1) + 1 FROM testimonials) + row_number() OVER (ORDER BY e.id),
             FALSE, TRUE, e.email, e."createdAt"
        FROM enquiries e
       WHERE e.source = 'recommendation';
      DELETE FROM enquiries WHERE source = 'recommendation';
    `,
  },

  {
    id: "019_drafts_shown_before_review_screen",
    sql: `
      -- Until the review screen shipped, the only way to put a submitted
      -- recommendation on the site was the visibility switch, which does not
      -- know about pendingReview. A row she switched on then is approved.
      UPDATE testimonials SET "pendingReview" = FALSE
       WHERE "pendingReview" AND "isVisible";
    `,
  },
];
