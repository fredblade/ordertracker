import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    
    // Fetch all inventory items joined with their parent order
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select(`
        id,
        order_id,
        product_name,
        quantity,
        unit_cost,
        sale_price,
        shipping_cost,
        status,
        created_at,
        orders (
          retailer,
          order_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ inventory });
  } catch (err: any) {
    console.error('Error fetching inventory:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await req.json();

    const { data, error } = await supabase
      .from('inventory')
      .insert({
        product_name: body.product_name,
        quantity: parseInt(body.quantity, 10) || 1,
        unit_cost: parseFloat(body.unit_cost) || 0.00,
        status: body.status || 'in_stock',
        sale_price: body.sale_price !== undefined && body.sale_price !== null ? parseFloat(body.sale_price) : null,
        shipping_cost: parseFloat(body.shipping_cost) || 0.00
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ item: data });
  } catch (err: any) {
    console.error('Error creating manual inventory item:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create item' },
      { status: 500 }
    );
  }
}

