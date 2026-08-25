// lib/supabase/middleware.ts
// Supabase session management in Next.js proxy.
// Must be called from the root proxy.ts to refresh sessions on every request.

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from './database.types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { pathname } = request.nextUrl;

  // Bypass session check for static, public, and PWA assets
  const isStaticOrPublic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|json)$/i.test(pathname);

  if (isStaticOrPublic) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes: redirect to login if not authenticated
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/forgot-password');
  const isChangePasswordRoute = pathname === '/change-password';
  const isProtectedRoute = !isAuthRoute && !isChangePasswordRoute;

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle must_change_password lifecycle for authenticated users
  if (user) {
    const mustChangePassword = user.app_metadata?.must_change_password === true;

    if (mustChangePassword) {
      // If forced to change password and navigating anywhere else, redirect to /change-password
      if (!isChangePasswordRoute) {
        const changePasswordUrl = request.nextUrl.clone();
        changePasswordUrl.pathname = '/change-password';
        return NextResponse.redirect(changePasswordUrl);
      }
    } else {
      // If not required to change password and hitting /change-password, redirect to /dashboard
      if (isChangePasswordRoute) {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = '/dashboard';
        return NextResponse.redirect(dashboardUrl);
      }

      // If hitting auth routes → redirect to dashboard
      if (isAuthRoute) {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = '/dashboard';
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return supabaseResponse;
}
