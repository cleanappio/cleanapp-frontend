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
};

module.exports = nextConfig;
