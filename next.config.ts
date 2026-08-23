import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimize images from Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Experimental features
  experimental: {
    // Inline server actions for better DX
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  // Strict security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
