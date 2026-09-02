import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting email account:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete email' },
      { status: 500 }
    );
  }
}
