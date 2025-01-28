/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["bujcyjitngtgpkabcqtk.supabase.co"], // あなたのSupabaseドメイン
  },
  experimental: {
    serverActions: true,
  },
  webpack: (config) => {
    config.externals = [...config.externals, "prisma", "postinstall"];
    return config;
  },
};

module.exports = nextConfig;
