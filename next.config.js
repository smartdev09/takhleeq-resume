const resolveAlias = {
  canvas: false,
  encoding: false,
};

/**
 * Redirects from the legacy `/dashboard/*` and `/resume-*` URLs to their
 * equivalent OS deep-links. 307 (temporary) so search engines don't bake in
 * the new URL until we're confident in the cutover; flip to 308 if we want
 * permanent redirects later.
 *
 * URL format: `?w=` is the compact window stack (e.g. `editor:abc-123`,
 * `templates`, `home%23faq`). See `src/app/os/lib/window-url.ts`.
 */
const redirects = async () => [
  // Dashboard routes → desktop home
  { source: "/dashboard", destination: "/", permanent: false },
  {
    source: "/dashboard/resumes",
    destination: "/?w=myResumes",
    permanent: false,
  },
  {
    source: "/dashboard/templates",
    destination: "/?w=templates",
    permanent: false,
  },
  {
    source: "/dashboard/templates/:id",
    destination: "/?w=templates",
    permanent: false,
  },
  {
    source: "/dashboard/job-search",
    destination: "/?w=jobMatcher",
    permanent: false,
  },
  // Resume builder routes → editor window
  {
    source: "/resume-builder",
    destination: "/?w=myResumes",
    permanent: false,
  },
  {
    source: "/resume-builder/:id",
    destination: "/?w=editor:%3Aid",
    permanent: false,
  },
  // Marketing tools → standalone OS apps
  { source: "/resume-parser", destination: "/?w=parser", permanent: false },
  { source: "/resume-import", destination: "/?w=importer", permanent: false },
  // Old short-link slug for resumes (planned `/r/[id]` deep-link)
  { source: "/r/:id", destination: "/?w=editor:%3Aid", permanent: false },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nextjs has an issue with pdfjs-dist which optionally uses the canvas package
  // for Node.js compatibility. This causes a "Module parse failed" error when
  // building the app. Since pdfjs-dist is only used on client side, we disable
  // the canvas package for webpack
  // https://github.com/mozilla/pdf.js/issues/16214
  output: "standalone",
  experimental: {
    esmExternals: "loose",
  },
  turbopack: {
    root: __dirname,
  },
  redirects,
  webpack: (config) => {
    // Setting resolve.alias to false tells webpack to ignore a module
    // https://webpack.js.org/configuration/resolve/#resolvealias
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...resolveAlias,
    };
    return config;
  },
};

module.exports = nextConfig;
