/**
 * Run this once to register your slash commands with Discord:
 *   node scripts/register-discord-commands.mjs
 *
 * Requires DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in your .env
 */

import { config } from 'dotenv';
config();

const APP_ID  = process.env.DISCORD_APPLICATION_ID;
const TOKEN   = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !TOKEN) {
  console.error('Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN in .env');
  process.exit(1);
}

const commands = [
  {
    name: 'sync',
    description: 'Trigger an email sync and update all order statuses',
  },
  {
    name: 'status',
    description: 'Check if Order Tracker is online',
  },
];

const res = await fetch(
  `https://discord.com/api/v10/applications/${APP_ID}/commands`,
  {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  }
);

if (res.ok) {
  const data = await res.json();
  console.log(`✅ Registered ${data.length} command(s):`);
  data.forEach((cmd) => console.log(`   /${cmd.name} - ${cmd.description}`));
} else {
  const err = await res.text();
  console.error('❌ Failed to register commands:', err);
}
