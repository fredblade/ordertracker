import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

// Discord interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;

// Discord response types
const PONG = 1;
const CHANNEL_MESSAGE_WITH_SOURCE = 4;
const DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5;

/**
 * Verify Discord's Ed25519 signature using the Web Crypto API.
 * Discord requires this verification or it will reject your endpoint.
 */
async function verifyDiscordSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return false;

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp  = request.headers.get('x-signature-timestamp');
  if (!signature || !timestamp) return false;

  try {
    const encoder = new TextEncoder();
    const keyBytes = hexToBytes(publicKey);
    const sigBytes = hexToBytes(signature);
    const msgBytes = encoder.encode(timestamp + body);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    return await crypto.subtle.verify('Ed25519', cryptoKey, sigBytes, msgBytes);
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // 1. Verify Discord's signature - required or Discord rejects the endpoint
  const isValid = await verifyDiscordSignature(request, body);
  if (!isValid) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const interaction = JSON.parse(body);

  // 2. Handle PING (Discord sends this to verify endpoint during setup)
  if (interaction.type === PING) {
    return NextResponse.json({ type: PONG });
  }

  // 3. Handle slash commands
  if (interaction.type === APPLICATION_COMMAND) {
    const commandName = interaction.data?.name;

    // /sync command - trigger the Inngest background sync
    if (commandName === 'sync') {
      try {
        await inngest.send({ name: 'order.sync.all', data: {} });

        return NextResponse.json({
          type: CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '🔄 **Sync triggered!** Checking emails and updating orders in the background. You\'ll get a notification here when any status changes.',
            flags: 64, // Ephemeral (only visible to the person who typed the command)
          },
        });
      } catch (err: any) {
        return NextResponse.json({
          type: CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Failed to trigger sync: ${err.message}`,
            flags: 64,
          },
        });
      }
    }

    // /status command - show a quick summary
    if (commandName === 'status') {
      return NextResponse.json({
        type: CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '📦 **Order Tracker** is online. Use `/sync` to pull the latest emails and update order statuses.',
          flags: 64,
        },
      });
    }

    // Unknown command
    return NextResponse.json({
      type: CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '❓ Unknown command.',
        flags: 64,
      },
    });
  }

  return new NextResponse('Unhandled interaction type', { status: 400 });
}
