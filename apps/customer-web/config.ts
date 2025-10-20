const path = require('path');

// ✅ No `.ts` extension
const withNextIntl = require('next-intl/plugin')('./i18n/config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true
  },
  transpilePackages: ['@shared'],
  webpack: (config) => {
    config.resolve.alias['@shared'] = path.resolve(__dirname, '../../shared');
    config.resolve.alias['@components'] = path.resolve(__dirname, '../../shared/frontend/components');
    config.resolve.alias['@atoms'] = path.resolve(__dirname, '../../shared/frontend/components/atoms');
    config.resolve.alias['@molecules'] = path.resolve(__dirname, '../../shared/frontend/components/molecules');
    config.resolve.alias['@theme'] = path.resolve(__dirname, '../../shared/frontend/theme');
    config.resolve.alias['@email'] = path.resolve(__dirname, '../../shared/utils/email');
    config.resolve.alias['@sms'] = path.resolve(__dirname, '../../shared/utils/sms');
    config.resolve.alias['@utils'] = path.resolve(__dirname, '../../shared/utils');
    config.resolve.alias['@types'] = path.resolve(__dirname, '../../shared/types');
    config.resolve.alias['@logs'] = path.resolve(__dirname, '../../shared/logs');
    return config;
  }
};

module.exports = withNextIntl(nextConfig);
