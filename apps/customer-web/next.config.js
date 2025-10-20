const path = require('path')
const withNextIntl = require('next-intl/plugin')()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
    transpilePackages: ['shared'],
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@atoms': path.resolve(__dirname, '../../shared/frontend/components/atoms'),
      '@theme': path.resolve(__dirname, '../../shared/frontend/theme'),
      '@shared': path.resolve(__dirname, '../../shared'),
    }
    return config
  },
}

module.exports = withNextIntl(nextConfig)
