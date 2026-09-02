import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
    }

    const payload = {
      embeds: [
        {
          title: '🔔 Webhook Alert Activated',
          description: 'Your Discord webhook has been successfully linked to **Order Tracker**.',
          fields: [
            { name: 'Environment', value: 'Local / Self-Use', inline: true },
            { name: 'Status', value: 'Online & Connected', inline: true }
          ],
          color: 8355711, // Purple-ish / Blurple
          timestamp: new Date().toISOString()
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord returned status code ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error sending test webhook:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch webhook' },
      { status: 500 }
    );
  }
}
