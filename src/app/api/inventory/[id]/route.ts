import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function PUT(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const body = await req.json();

    const updateFields: any = {};
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.sale_price !== undefined) updateFields.sale_price = body.sale_price !== null ? parseFloat(body.sale_price) : null;
    if (body.shipping_cost !== undefined) updateFields.shipping_cost = parseFloat(body.shipping_cost) || 0;
    if (body.product_name !== undefined) updateFields.product_name = body.product_name;
    if (body.quantity !== undefined) updateFields.quantity = parseInt(body.quantity, 10);
    if (body.unit_cost !== undefined) updateFields.unit_cost = parseFloat(body.unit_cost);

    const { data, error } = await supabase
      .from('inventory')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ item: data });
  } catch (err: any) {
    console.error('Error updating inventory item:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting inventory item:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete item' },
      { status: 500 }
    );
  }
}
