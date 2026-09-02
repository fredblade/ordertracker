import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'discord_webhook')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ settings: data || { key: 'discord_webhook', value: { url: '' } } });
  } catch (err: any) {
    console.error('Error loading settings:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await req.json();
    const url = body.url || '';

    const { data, error } = await supabase
      .from('settings')
      .upsert({
        key: 'discord_webhook',
        value: { url }
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ settings: data });
  } catch (err: any) {
    console.error('Error saving settings:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}
