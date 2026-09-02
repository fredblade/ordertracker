import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    // Fetch the 10 most recent sync logs
    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select(`
        id,
        status,
        message,
        duration_ms,
        created_at,
        email_accounts (
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error('Error fetching sync logs:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
