const DEV_WATCH_IGNORED = [
  "**/.git/**",
  "**/.next/**",
  "**/docs/**",
  "**/docs_public/**",
  "**/monitoring/**",
  "**/outputs/**",
  "**/playground/evaluations/**",
  "**/playground/outputs/**",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config, { dev }) => {
    if (!dev) {
      return config;
    }

    config.watchOptions = {
      ...config.watchOptions,
      ignored: DEV_WATCH_IGNORED,
      // Use polling in development to avoid exhausting file-descriptor-based
      // watchers on large local workspaces.
      poll: 1000,
      aggregateTimeout: 300,
    };

    return config;
  },
};

export default nextConfig;
