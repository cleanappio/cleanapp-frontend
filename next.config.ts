/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'], // Add your domain here if needed
  },
  i18n: {
    locales: ['en', 'es', 'fr', 'de', 'me'],
    defaultLocale: 'en',
    localeDetection: false,
  },
}

module.exports = nextConfig
