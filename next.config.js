/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["bujcyjitngtgpkabcqtk.supabase.co"],
  },
  webpack: (config) => {
    config.externals = [...config.externals, "pg-native"];
    return config;
  },
};

module.exports = nextConfig;
