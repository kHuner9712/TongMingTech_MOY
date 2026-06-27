/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@moy/shared', '@moy/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
