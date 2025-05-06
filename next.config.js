/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['three'],
};

module.exports = nextConfig;
