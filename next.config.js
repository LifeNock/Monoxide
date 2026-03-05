/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.laughingemoji.net',
      },
    ],
  },
};

module.exports = nextConfig;
