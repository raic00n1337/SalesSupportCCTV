/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed 'output: export' to enable API routes
  // Using Netlify's Next.js Runtime instead
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
