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
  // Vercel本番環境最適化
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // ビルド出力ディレクトリを変更して権限問題を回避
  distDir: process.env.NODE_ENV === "production" ? ".next" : "build",
  // テレメトリー無効化
  experimental: {
    instrumentationHook: false,
  },
};

module.exports = nextConfig;
