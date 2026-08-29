/** @type {import('next').NextConfig} */

/* Response headers for everything this process serves: the dashboard, the RPC
   endpoint and the media route.

   The public site is a static export on GitHub Pages, which sends no headers of
   its own and cannot be configured to, so these protect the half that actually
   holds a session: /admin and /api.

   No Content-Security-Policy here. The dashboard is a Next client app that
   needs 'unsafe-inline'/'unsafe-eval' for its own bootstrap, so a policy loose
   enough to run it would not stop much — and one tight enough to matter would
   break it on deploy, where it is hardest to notice. The media route sets its
   own strict `default-src 'none'; sandbox` per response, which is where a CSP
   earns its keep: that route echoes bytes somebody uploaded. */
const securityHeaders = [
  // The dashboard has no reason to be framed. Blocks clickjacking a signed-in
  // operator into clicking Publish or Delete inside an invisible iframe.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },

  // Never let a browser second-guess a declared content type. Paired with the
  // upload allowlist, this is what keeps a mislabelled file from being run.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Admin URLs carry record ids. Send the full URL only to ourselves.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Nothing here uses a camera, a microphone or a location.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },

  // Railway terminates TLS, so downgrade is the remaining exposure. Two years,
  // subdomains included. No `preload`: that is a one-way door for the apex
  // domain and is not this file's decision to make.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig = {
  // Server mode (Railway) — API routes, SSR, and the admin dashboard.
  // For a static export of the public site set: output: "export", trailingSlash: true

  // Do not advertise the framework version to a scanner.
  poweredByHeader: false,

  // `pg` reaches for `fs` and optionally `pg-native`. Bundling it makes the
  // instrumentation hook fail to compile for the edge runtime and fills the
  // log with unresolvable-module warnings; it is a server dependency and
  // should be required at runtime, not packed.
  serverExternalPackages: ["pg"],

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
