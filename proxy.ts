// proxy.ts (root)
// Next.js Proxy — runs on every matching request.

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - favicon.ico, manifest.webmanifest, manifest.json
     * - static public files (*.svg, *.png, *.jpg, *.jpeg, *.gif, *.webp, *.ico, *.json, *.webmanifest)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|json)$).*)',
  ],
};
