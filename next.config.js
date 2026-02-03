/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Use remotePatterns for newer Next.js versions (more secure and flexible)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "live.cleanapp.io",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "devlive.cleanapp.io",
        pathname: "/api/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
    ],
    // Keep domains for backward compatibility
    domains: ["localhost", "live.cleanapp.io", "devlive.cleanapp.io"],
  },
  i18n: {
    locales: ["en", "me"],
    defaultLocale: "en",
    localeDetection: false,
  },
  // Proxy API requests to avoid CORS issues during local development
  async rewrites() {
    return [
      {
        source: "/api/live/:path*",
        destination: `${process.env.NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io"}/api/:path*`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Exclude canvas native module from server-side builds
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        canvas: "canvas",
      });
    }
    return config;
  },
};

module.exports = nextConfig;
