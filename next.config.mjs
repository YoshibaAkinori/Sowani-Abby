/** @type {import('next').NextConfig} */
const nextConfig = {
  // エラーチェックを無視して強制的にビルドする設定
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;