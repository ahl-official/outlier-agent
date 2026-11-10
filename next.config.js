/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static', 'ffprobe-static'],
    outputFileTracingIncludes: {
      '/api/breakdown': [
        './node_modules/ffmpeg-static/ffmpeg',
        './node_modules/ffprobe-static/bin/linux/x64/ffprobe'
      ]
    }
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ]
  }
};

module.exports = nextConfig;
