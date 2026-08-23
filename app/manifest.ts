// app/manifest.ts
// Native Next.js App Router Web App Manifest (PWA)

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WACT — Warehouse Action & Case Tracker',
    short_name: 'WACT',
    description: 'Internal warehouse monitoring, QC, and case management system',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#2563EB',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
