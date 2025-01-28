/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["bujcyjitngtgpkabcqtk.supabase.co"],
  },
  experimental: {
    serverActions: true,
  },
  webpack: (config) => {
    config.externals = [...config.externals, "prisma", "postinstall"];
    return config;
  },
  // 追加
  pageExtensions: ["js", "jsx", "ts", "tsx"],
};

module.exports = nextConfig;
