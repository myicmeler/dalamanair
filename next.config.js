/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}
module.exports = nextConfig
