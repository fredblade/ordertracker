import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  // Fetch the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Fetch the Discord webhook URL from settings
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'discord_webhook')
    .single();

  const webhookUrl: string = (setting?.value as any)?.url || '';

  if (!webhookUrl) {
    return NextResponse.json({ error: 'Discord webhook not configured' }, { status: 400 });
  }

  // Build the embed payload (mirrors the Inngest helper)
  const colorMap: Record<string, number> = {
    pending: 16776960,
    shipped: 3447003,
    delivered: 3066993,
    cancelled: 16711680,
    action_required: 15158332,
  };

  const status = order.status?.toLowerCase() ?? 'pending';
  const color = colorMap[status] ?? 3447003;

  const itemsList = (order.items ?? [])
    .map((i: any) => {
      const price = i.unit_price ?? i.price;
      const priceSuffix = price != null ? ` @ $${Number(price).toFixed(2)}` : '';
      return `- ${i.name} (Qty: ${i.quantity}${priceSuffix})`;
    })
    .join('\n');

  let title = `📦 Order Update: ${status.replace('_', ' ').toUpperCase()}`;
  if (status === 'action_required') title = `⚠️ Action Required: Preorder Payment Update Needed`;

  const payload = {
    embeds: [
      {
        title,
        color,
        fields: [
          { name: 'Order #', value: `\`${order.order_number}\``, inline: true },
          { name: 'Retailer', value: order.retailer, inline: true },
          { name: 'Order Date', value: order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A', inline: true },
          { name: 'Carrier', value: order.carrier || 'Pending', inline: true },
          { name: 'Tracking Number', value: order.tracking_number ? `\`${order.tracking_number}\`` : 'Not Available', inline: true },
          ...(order.total != null && Number(order.total) > 0
            ? [{ name: 'Order Total', value: `**$${Number(order.total).toFixed(2)} ${order.currency || 'USD'}**`, inline: true }]
            : []),
          ...(itemsList ? [{ name: 'Items', value: itemsList }] : []),
          ...(order.delivered_to ? [{ name: 'Delivered To', value: order.delivered_to, inline: true }] : []),
          ...(order.original_recipient && order.original_recipient !== order.delivered_to
            ? [{ name: 'Via', value: order.original_recipient, inline: true }]
            : []),
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Order Tracker Alerts - Manual Send' },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Discord returned ${res.status}: ${text}` }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send webhook' }, { status: 500 });
  }
}
