import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isEmailAllowed } from '@/lib/auth';

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/api/inngest',        // Inngest webhook must remain public
  '/api/sync/cron',     // Cron trigger (optionally protect with a secret header)
  '/_next',
  '/favicon.ico',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through without auth check
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Create a response to mutate (needed for cookie refresh)
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not call supabase.auth.getSession() - use getUser() for security
  const { data: { user } } = await supabase.auth.getUser();

  // No session at all - redirect to login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Session exists but email is not on the allowlist
  if (!isEmailAllowed(user.email)) {
    console.warn(`[Proxy] Blocked unauthorized user: ${user.email}`);
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  // Authorized - allow request through with refreshed session cookies
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
