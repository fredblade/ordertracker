import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isEmailAllowed } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Exchange the code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Auth callback error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Allowlist check - only emails in ALLOWED_EMAILS may sign in
  if (!user || !isEmailAllowed(user.email)) {
    console.warn(`Blocked unauthorized login attempt: ${user?.email}`);
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  // Success - redirect to dashboard
  return NextResponse.redirect(`${origin}/`);
}
