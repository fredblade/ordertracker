'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Boxes, 
  Settings as SettingsIcon, 
  RefreshCw, 
  Menu, 
  X,
  PackageCheck,
  LogOut
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Fetch initial sync status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/sync/status');
        if (res.ok) {
          const data = await res.json();
          if (data.lastSyncedAt) {
            setLastSynced(new Date(data.lastSyncedAt).toLocaleString());
          }
          setIsSyncing(data.status === 'syncing');
        }
      } catch (err) {
        console.error('Failed to load sync status:', err);
      }
    }
    fetchStatus();

    // Set up polling to check if a background sync is still running
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/cron', { method: 'POST' });
      if (res.ok) {
        alert('Sync triggered in the background. Dashboard will update automatically.');
      } else {
        alert('Failed to trigger synchronization.');
        setIsSyncing(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering sync.');
      setIsSyncing(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Delivery Calendar', href: '/calendar', icon: CalendarIcon },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Inventory & P&L', href: '/inventory', icon: Boxes },
    { name: 'Settings & Email', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <PackageCheck className="h-7 w-7 text-primary" />
          <span className="font-mono font-bold text-lg tracking-tight">ORDER TRACKER</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      <div className="flex flex-1 flex-col md:flex-row relative">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 bg-card border-r border-border flex-col justify-between p-6 sticky top-0 h-screen">
          <div className="flex flex-col gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3 pl-2.5">
              <PackageCheck className="h-8 w-8 text-primary" />
              <span className="font-mono font-extrabold text-xl tracking-tight">
                ORDER TRACKER
              </span>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all border-l-4",
                      isActive 
                        ? "bg-primary/10 text-primary border-primary" 
                        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/40"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sync Button & User Footer */}
          <div className="flex flex-col gap-5">
            <Button 
              onClick={handleSyncNow} 
              disabled={isSyncing}
              size="lg"
              className="w-full justify-center gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            
            {lastSynced && (
              <div className="text-xxs text-muted-foreground text-center">
                Last synced: {lastSynced}
              </div>
            )}

            <div className="border-t border-border pt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-sm text-primary-foreground">
                  SU
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-tight">Self User</span>
                  <span className="text-xxs text-muted-foreground">Local Mode</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon-sm"
                onClick={handleSignOut}
                title="Sign Out"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <aside className="fixed inset-x-0 bottom-0 top-[61px] bg-card z-40 flex flex-col p-6 border-t border-border justify-between md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-base transition-all",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    )}
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-4">
              <Button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSyncNow();
                }}
                disabled={isSyncing}
                size="lg"
                className="w-full justify-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              
              <Button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSignOut();
                }}
                variant="destructive"
                size="lg"
                className="w-full justify-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>

              {lastSynced && (
                <div className="text-xxs text-muted-foreground text-center">
                  Last synced: {lastSynced}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
