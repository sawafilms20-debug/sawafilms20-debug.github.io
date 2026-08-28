/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server mode (Railway) — API routes, SSR, and the admin dashboard.
  // For a static export of the public site set: output: "export", trailingSlash: true

  // `pg` reaches for `fs` and optionally `pg-native`. Bundling it makes the
  // instrumentation hook fail to compile for the edge runtime and fills the
  // log with unresolvable-module warnings; it is a server dependency and
  // should be required at runtime, not packed.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
