import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    
    // 1. Check if any account has status = 'syncing'
    const { data: syncingAccounts, error: syncError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('status', 'syncing')
      .limit(1);

    if (syncError) throw new Error(syncError.message);

    const isSyncing = syncingAccounts && syncingAccounts.length > 0;

    // 2. Fetch the most recent successful sync timestamp
    const { data: latestSync, error: dateError } = await supabase
      .from('email_accounts')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .not('last_synced_at', 'is', null)
      .limit(1)
      .maybeSingle();

    if (dateError) throw new Error(dateError.message);

    return NextResponse.json({
      status: isSyncing ? 'syncing' : 'idle',
      lastSyncedAt: latestSync?.last_synced_at || null
    });
  } catch (err: any) {
    console.error('Error fetching sync status:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
