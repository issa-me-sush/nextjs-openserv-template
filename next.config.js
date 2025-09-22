/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@openserv-labs/sdk',
    'pino',
    'pino-pretty'
  ],
  experimental: {
    serverComponentsExternalPackages: [
      'pino',
      'pino-pretty'
    ]
  }
}

module.exports = nextConfig
