/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["bujcyjitngtgpkabcqtk.supabase.co"],
  },
  experimental: {
    serverActions: true,
  },
  // Prisma関連の設定を追加
  webpack: (config) => {
    config.externals = [...config.externals, "pg-native"];
    return config;
  },
};

module.exports = nextConfig;
