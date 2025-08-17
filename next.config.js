/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["bujcyjitngtgpkabcqtk.supabase.co"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
