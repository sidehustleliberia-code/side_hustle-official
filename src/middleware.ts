import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

export async function middleware(request: NextRequest) {
  injectTokenFromHeader(request);
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/unified-authentication-portal';
      return NextResponse.redirect(url);
    }

    // Check role from user_metadata first, then app_metadata, then user_profiles table
    const metaRole = user.user_metadata?.role || user.app_metadata?.role;

    if (metaRole === 'admin') {
      // Role confirmed via JWT metadata — allow through
      return supabaseResponse;
    }

    // Fall back to querying user_profiles for the role (handles admin accounts
    // created directly in Supabase where user_metadata.role may not be set)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // Protect provider routes
  if (
    pathname.startsWith('/provider-dashboard') ||
    pathname.startsWith('/active-job') ||
    pathname.startsWith('/provider-earnings') ||
    pathname.startsWith('/provider-onboarding')
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/unified-authentication-portal';
      return NextResponse.redirect(url);
    }
  }

  // Protect customer routes — both the booking form and the dashboard require auth
  if (
    pathname.startsWith('/service-request-order-form') ||
    pathname.startsWith('/job-progress') ||
    pathname.startsWith('/customer-dashboard')
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      // Preserve the intended destination so we can redirect back after login
      url.pathname = '/unified-authentication-portal';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Only run middleware on page routes that actually need auth protection.
     * Exclude: _next/static, _next/image, favicon, public assets, and API routes
     * that don't require session checks.  This prevents supabase.auth.getUser()
     * from firing on every static asset request, which was a major source of
     * latency during the login redirect.
     */
    '/admin/:path*','/provider-dashboard/:path*','/active-job/:path*','/provider-earnings/:path*','/provider-onboarding/:path*','/service-request-order-form/:path*','/job-progress/:path*','/customer-dashboard/:path*',
  ],
};
