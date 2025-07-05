/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure output for better performance with Vercel
  output: 'standalone',
  
  // Disable image optimization during development for faster builds
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Increase the timeout for static generation
  staticPageGenerationTimeout: 180,
  
  // Disable React strict mode for Phaser compatibility
  reactStrictMode: false,
};

module.exports = nextConfig;
