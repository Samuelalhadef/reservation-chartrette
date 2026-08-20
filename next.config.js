/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignore ESLint errors during build for deployment
    ignoreDuringBuilds: true,
  },
  images: {
    // Formats modernes : meilleures compressions servies automatiquement.
    formats: ['image/webp'],
    // Les visuels changent rarement : on garde les variantes optimisées 30 jours
    // au lieu de les recalculer (le cache est vidé à chaque redéploiement).
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
