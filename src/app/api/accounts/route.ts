import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ accounts });
  } catch (err: any) {
    console.error('Error fetching email accounts:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await req.json();

    const { data, error } = await supabase
      .from('email_accounts')
      .insert({
        email: body.email,
        provider: body.provider,
        credentials: body.credentials || {},
        status: 'connected'
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ account: data });
  } catch (err: any) {
    console.error('Error creating email account:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to connect email' },
      { status: 500 }
    );
  }
}
