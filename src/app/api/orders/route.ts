import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ orders });
  } catch (err: any) {
    console.error('Error fetching orders:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
