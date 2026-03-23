/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@scout/types", "@scout/schemas"],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
