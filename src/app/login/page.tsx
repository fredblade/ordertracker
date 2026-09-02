'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'unauthorized') {
      setError('Access denied. Only the authorized account may sign in.');
    } else if (err === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12 relative overflow-hidden">
      
      {/* Background ambient glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center gap-8">

        {/* Logo / Brand Mark */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/40 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 8h24M4 16h16M4 24h20" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="26" cy="22" r="5" stroke="#6366f1" strokeWidth="2"/>
              <path d="M24 22l1.5 1.5L28 20" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-mono text-foreground">
            ORDER TRACKER
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Private logistics dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="w-full border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-base font-bold font-mono">Secure Access Required</CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-normal mt-1.5">
              This dashboard is private. Sign in with your authorized Google account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold rounded-lg mb-5">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Google Sign In Button */}
            <Button
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              variant="outline"
              size="lg"
              className="w-full py-6 gap-3 font-semibold text-sm border-border hover:border-primary/40 hover:bg-accent/30 transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-primary shrink-0" />
                  Redirecting to Google...
                </>
              ) : (
                <>
                  {/* Google Logo SVG */}
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          Unauthorized access attempts are logged and blocked.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
