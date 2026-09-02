import { inngest } from '@/lib/inngest/client';
import { createServerSupabase } from '@/lib/supabase/server';
import { generateMockEmails } from '@/lib/mail/mock-inbox';
import { progressMockTracking, initializeMockTracking } from '@/lib/carrier/status';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { routeAndParse } from '@/lib/mail/router';
import { normalizeOrderMerge } from '@/lib/mail/normalizer';

// Helper: Send Discord Webhook Embedded Notification
async function sendDiscordNotification(webhookUrl: string, order: any, oldStatus: string, newStatus: string, updateDetails: string) {
  if (!webhookUrl) return;

  const colorMap: Record<string, number> = {
    pending: 16776960,     // Yellow (Hex #FFFF00)
    shipped: 3447003,      // Blue (Hex #3498DB)
    delivered: 3066993,    // Green (Hex #2ECC71)
    cancelled: 16711680,   // Red (Hex #FF0000)
    action_required: 15158332 // Red/Orange (Hex #E74C3C)
  };

  const currentStatus = newStatus.toLowerCase();
  const color = colorMap[currentStatus] || 3447003;
  const itemsList = order.items.map((i: any) => {
    const itemPrice = i.unit_price ?? i.price;
    const priceSuffix = (itemPrice !== undefined && itemPrice !== null)
      ? ` @ $${Number(itemPrice).toFixed(2)}`
      : '';
    return `- ${i.name} (Qty: ${i.quantity}${priceSuffix})`;
  }).join('\n');

  const isCreated = oldStatus === 'none';
  let title = isCreated ? `✨ New Order Created: ${newStatus.toUpperCase()}` : `📦 Package Update: ${newStatus.toUpperCase()}`;
  if (newStatus === 'action_required') {
    title = `⚠️ Action Required: Preorder Payment Update Needed`;
  }
  const description = isCreated 
    ? `Order **${order.order_number}** from **${order.retailer}** has been created with status **${newStatus.replace('_', ' ')}**.`
    : `Order **${order.order_number}** from **${order.retailer}** has been updated from **${oldStatus.replace('_', ' ')}** to **${newStatus.replace('_', ' ')}**.`;

  const payload = {
    embeds: [
      {
        title: title,
        description: description,
        color: color,
        fields: [
          { name: 'Retailer', value: order.retailer, inline: true },
          { name: 'Order Date', value: order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A', inline: true },
          { name: 'Carrier', value: order.carrier || 'Pending', inline: true },
          { name: 'Tracking Number', value: order.tracking_number ? `\`${order.tracking_number}\`` : 'Not Available', inline: true },
          ...(order.total !== undefined && order.total !== null && Number(order.total) > 0
            ? [{ name: 'Order Total', value: `**$${Number(order.total).toFixed(2)} ${order.currency || 'USD'}**`, inline: true }]
            : []),
          { name: 'Items', value: itemsList || 'No items listed' },
          ...(order.delivered_to ? [{ name: 'Delivered To', value: order.delivered_to, inline: true }] : []),
          ...(order.original_recipient && order.original_recipient !== order.delivered_to ? [{ name: 'Via', value: order.original_recipient, inline: true }] : []),
          { name: 'Latest Update', value: updateDetails || 'No details available.' }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Order Tracker Alerts',
        }
      }
    ]
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Failed to send Discord webhook:', err);
  }
}

// Helper to clean email address and extract it if it's formatted or wrapped as object/JSON
function cleanEmailAddress(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') {
    // If it's a JSON string by some chance, try to parse it
    if (value.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        return cleanEmailAddress(parsed);
      } catch {
        // Fall through
      }
    }
    // Clean email from string (e.g. "Name <email@domain.com>" or just "email@domain.com")
    const match = value.match(/<([^>]+)>/) || value.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return match ? match[1] : value.trim();
  }
  if (typeof value === 'object') {
    // Check if it has value array (AddressObject)
    if (value.value && Array.isArray(value.value) && value.value[0]?.address) {
      return value.value[0].address;
    }
    if (value.address) {
      return value.address;
    }
    if (value.text) {
      return cleanEmailAddress(value.text);
    }
  }
  return '';
}

// Inngest Background Task Function
export const syncAllAccounts = inngest.createFunction(
  { 
    id: 'sync-all-accounts',
    name: 'Sync All Accounts',
    // Runs on the manual/cron-route event AND on a schedule (every 30 min in production)
    triggers: [{ event: 'order.sync.all' }, { cron: '*/30 * * * *' }]
  },
  async ({ step }) => {
    const startTime = Date.now();
    const supabase = await createServerSupabase();

    // 1. Fetch all configured accounts
    const accounts = await step.run('fetch-accounts', async () => {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*');
      
      if (error) throw new Error(`DB error: ${error.message}`);
      return data || [];
    });

    if (accounts.length === 0) {
      return { message: 'No accounts configured for synchronization.' };
    }

    const webhookUrl = await step.run('fetch-webhook-settings', async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'discord_webhook')
        .single();
      
      if (error || !data) return '';
      return (data.value as any)?.url || '';
    });

    const results = [];

    // Loop through accounts and perform sync
    for (const account of accounts) {
      const accountResult = await step.run(`sync-account-${account.id}`, async () => {
        const syncSubStart = Date.now();
        let parsedEmailsCount = 0;
        let ordersUpdatedCount = 0;

        try {
          // Set account status to syncing
          await supabase
            .from('email_accounts')
            .update({ status: 'syncing' })
            .eq('id', account.id);

          let emails: {
            id: string;
            from: string;
            subject: string;
            date: string;
            html: string;
            deliveredTo?: string;
            originalTo?: string;
          }[] = [];

          if (account.provider === 'mock') {
            const speed = account.credentials?.speed || 1;
            emails = generateMockEmails(speed);
          } else {
            console.log(`Real IMAP Sync starting for: ${account.email}`);
            const creds = (account.credentials || {}) as any;
            const imap = new ImapFlow({
              host: creds.host || 'imap.gmail.com',
              port: parseInt(creds.port) || 993,
              secure: creds.secure !== undefined ? creds.secure : true,
              auth: {
                user: creds.user || account.email,
                pass: creds.password || creds.pass || ''
              },
              logger: false
            });

            // Fetch raw emails from DB for lookback to filter out duplicates
            const { data: existingRawEmailsDb } = await supabase
              .from('raw_emails')
              .select('subject, date, from_address')
              .eq('account_id', account.id)
              .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
            
            const existingRawEmails = existingRawEmailsDb || [];

            await imap.connect();
            const lock = await imap.getMailboxLock('INBOX');
            try {
              // Search for unseen messages AND messages from the last 7 days (even if read)
              const unseenQuery = { seen: false };
              const recentQuery = { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
              
              const [unseenUids, recentUids] = await Promise.all([
                imap.search(unseenQuery),
                imap.search(recentQuery)
              ]);
              
              const uniqueUids = Array.from(new Set([...(unseenUids || []), ...(recentUids || [])]));

              if (uniqueUids.length > 0) {
                // Fetch envelopes to filter out already processed emails
                const fetchResult = imap.fetch(uniqueUids, { envelope: true });
                const seqToEnvelope = new Map<number, any>();
                for await (const msg of fetchResult) {
                  seqToEnvelope.set(msg.seq, msg.envelope);
                }

                const messagesToFetchSource: number[] = [];
                for (const seq of uniqueUids) {
                  const env = seqToEnvelope.get(seq);
                  if (!env) continue;

                  const fromText = env.from?.[0]?.address || 'unknown';
                  const subjectText = env.subject || '';
                  const msgDate = env.date ? new Date(env.date).toISOString() : '';

                  const cleanRawSubject = (s: string) => s.replace(/\s+/g, ' ').trim();

                  const isAlreadyProcessed = existingRawEmails.some(raw => 
                    cleanRawSubject(raw.subject) === cleanRawSubject(subjectText) && 
                    cleanEmailAddress(raw.from_address) === cleanEmailAddress(fromText) &&
                    new Date(raw.date).getTime() === new Date(msgDate).getTime()
                  );

                  if (!isAlreadyProcessed) {
                    messagesToFetchSource.push(seq);
                  }
                }

                if (messagesToFetchSource.length > 0) {
                  for (const seq of messagesToFetchSource) {
                    const message = await imap.fetchOne(seq, { source: true });
                    if (message && message.source) {
                      const parsedMail = await simpleParser(message.source);
                      const rawDeliveredTo =
                        parsedMail.headers?.get('delivered-to') ||
                        parsedMail.headerLines?.find((h: any) => h.key === 'delivered-to')?.line?.replace(/^delivered-to:\s*/i, '').trim() ||
                        '';
                      const deliveredTo = cleanEmailAddress(rawDeliveredTo);
                      const originalTo = cleanEmailAddress(parsedMail.to);
                      emails.push({
                        id: seq.toString(),
                        from: parsedMail.from?.text || parsedMail.from?.value?.[0]?.address || 'unknown',
                        subject: parsedMail.subject || '',
                        date: parsedMail.date ? parsedMail.date.toISOString() : new Date().toISOString(),
                        html: parsedMail.html || parsedMail.textAsHtml || parsedMail.text || '',
                        deliveredTo,
                        originalTo,
                      });
                      
                      // Mark the email as seen so we don't process it again next time
                      await imap.messageFlagsAdd(seq, ['\\Seen']);
                    }
                  }
                }
              }
            } finally {
              lock.release();
              await imap.logout();
            }
          }

          parsedEmailsCount = emails.length;

          // Parse and process each email
          for (const email of emails) {
            // Save raw email to database
            const { data: rawEmail } = await supabase
              .from('raw_emails')
              .insert({
                account_id: account.id,
                subject: email.subject,
                from_address: email.from,
                to_address: email.originalTo || null,
                delivered_to: email.deliveredTo || null,
                html_content: email.html,
                date: email.date || new Date().toISOString()
              })
              .select('id')
              .single();

            const rawEmailId = rawEmail?.id;

            const parsed = routeAndParse(email.subject, email.from, email.html, {
              deliveredTo: email.deliveredTo,
              originalTo: email.originalTo,
              receivedDate: email.date,
            });
            if (!parsed) continue;

            // Fallback order number resolution by items check (e.g. for Action Required emails without Order Number)
            if (parsed.orderNumber === 'UNKNOWN' && parsed.items.length > 0) {
              const { data: candidateOrders } = await supabase
                .from('orders')
                .select('id, order_number, items')
                .eq('retailer', parsed.retailer)
                .not('status', 'eq', 'cancelled');
              
              let matched = false;
              if (candidateOrders && candidateOrders.length > 0) {
                for (const candidate of candidateOrders) {
                  const candidateItems = (candidate.items || []) as any[];
                  const hasOverlap = parsed.items.some(pi => 
                    candidateItems.some(ci => ci.name.toLowerCase() === pi.name.toLowerCase())
                  );
                  if (hasOverlap) {
                    parsed.orderNumber = candidate.order_number;
                    matched = true;
                    break;
                  }
                }
              }

              // If still UNKNOWN and we have items, create a consistent temporary order number based on item names
              if (!matched) {
                const sortedItemNames = parsed.items.map(i => i.name).sort().join('|');
                let hash = 0;
                for (let i = 0; i < sortedItemNames.length; i++) {
                  hash = (hash << 5) - hash + sortedItemNames.charCodeAt(i);
                  hash |= 0;
                }
                const uniqueHash = Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
                parsed.orderNumber = `UNKNOWN-${uniqueHash}`;
              }
            }

            if (parsed.orderNumber === 'UNKNOWN') continue;

            // Merge healing: If we have a real order number, see if we have a temporary order under UNKNOWN- that we should rename
            if (parsed.orderNumber !== 'UNKNOWN' && !parsed.orderNumber.startsWith('UNKNOWN-') && parsed.items.length > 0) {
              const { data: tempOrders } = await supabase
                .from('orders')
                .select('id, order_number, items')
                .eq('retailer', parsed.retailer)
                .like('order_number', 'UNKNOWN-%');
              
              if (tempOrders && tempOrders.length > 0) {
                for (const tempOrder of tempOrders) {
                  const tempItems = (tempOrder.items || []) as any[];
                  const hasOverlap = parsed.items.some(pi => 
                    tempItems.some(ci => ci.name.toLowerCase() === pi.name.toLowerCase())
                  );
                  if (hasOverlap) {
                    // Update the database to rename the temporary order number to the real one
                    await supabase
                      .from('orders')
                      .update({ order_number: parsed.orderNumber })
                      .eq('id', tempOrder.id);
                    break;
                  }
                }
              }
            }

            // Fetch existing order to compare status changes
            const { data: existingOrder } = await supabase
              .from('orders')
              .select('*')
              .eq('retailer', parsed.retailer)
              .eq('order_number', parsed.orderNumber)
              .maybeSingle();

            const oldStatus = existingOrder?.status || 'pending';
            const mergedOrder = normalizeOrderMerge(existingOrder, parsed, rawEmailId);

            // Add alert event if payment action required
            if (/action\s*required|payment/i.test(email.subject)) {
              mergedOrder.status = 'action_required';
              
              const actionEvent = {
                status: 'action_required',
                details: `⚠️ Action Required: ${email.subject}`,
                location: parsed.retailer,
                timestamp: email.date || new Date().toISOString()
              };
              const hasSameEvent = (mergedOrder.tracking_history || []).some((h: any) => 
                h.details === actionEvent.details
              );
              if (!hasSameEvent) {
                mergedOrder.tracking_history = [
                  ...(mergedOrder.tracking_history || []),
                  actionEvent
                ];
              }
            }

            // Save or Update Order
            const { data: savedOrder, error: orderError } = await supabase
              .from('orders')
              .upsert({
                id: existingOrder?.id,
                account_id: existingOrder ? existingOrder.account_id : account.id,
                delivered_to: parsed.deliveredTo || null,
                original_recipient: parsed.originalRecipient || null,
                created_at: existingOrder ? existingOrder.created_at : new Date(email.date || Date.now()).toISOString(),
                ...mergedOrder
              }, {
                onConflict: 'retailer,order_number'
              })
              .select()
              .single();

            if (orderError) {
              console.error('Error saving order:', orderError);
              continue;
            }

            ordersUpdatedCount++;

            // Sync Inventory automatically
            if (savedOrder && parsed.items.length > 0) {
              for (const item of parsed.items) {
                // Check if this item is already recorded in inventory for this order
                const { data: existingInventory } = await supabase
                  .from('inventory')
                  .select('id')
                  .eq('order_id', savedOrder.id)
                  .eq('product_name', item.name)
                  .maybeSingle();

                if (!existingInventory) {
                  await supabase
                    .from('inventory')
                    .insert({
                      order_id: savedOrder.id,
                      product_name: item.name,
                      quantity: item.quantity,
                      unit_cost: item.unit_price || 0.00,
                      status: 'in_stock'
                    });
                }
              }
            }

            // Trigger notification if order is newly created OR status updated
            if (!existingOrder || oldStatus !== savedOrder.status) {
              const history = (savedOrder.tracking_history || []) as any[];
              const latestEvent = history[history.length - 1];
              await sendDiscordNotification(
                webhookUrl,
                savedOrder,
                existingOrder ? oldStatus : 'none',
                savedOrder.status,
                existingOrder ? (latestEvent?.details || 'Status updated via email sync.') : 'Order created via email parser.'
              );
            }
          }

          // Update Account Success state
          await supabase
            .from('email_accounts')
            .update({
              status: 'connected',
              last_synced_at: new Date().toISOString()
            })
            .eq('id', account.id);

          // Log the Sync Log
          await supabase
            .from('sync_logs')
            .insert({
              account_id: account.id,
              status: 'success',
              message: `Synced ${parsedEmailsCount} messages. Updated/Upserted ${ordersUpdatedCount} orders.`,
              duration_ms: Date.now() - syncSubStart
            });

          return {
            accountId: account.id,
            email: account.email,
            status: 'success',
            emailsProcessed: parsedEmailsCount,
            ordersUpdated: ordersUpdatedCount
          };

        } catch (err: any) {
          console.error(`Sync error on account ${account.email}:`, err);
          
          await supabase
            .from('email_accounts')
            .update({ status: 'error' })
            .eq('id', account.id);

          await supabase
            .from('sync_logs')
            .insert({
              account_id: account.id,
              status: 'failed',
              message: err.message || 'Unknown synchronization error',
              duration_ms: Date.now() - syncSubStart
            });

          return {
            accountId: account.id,
            email: account.email,
            status: 'failed',
            error: err.message
          };
        }
      });

      results.push(accountResult);
    }

    // 2. Carrier Tracking Update loop for ALL ACTIVE ORDERS (regardless of email account)
    // This simulates the active progression of mock orders over time.
    await step.run('progress-tracking-status', async () => {
      const { data: mockAccounts } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('provider', 'mock');
      
      const mockAccountIds = (mockAccounts || []).map(a => a.id);
      if (mockAccountIds.length === 0) {
        return { activeOrdersChecked: 0 };
      }

      const { data: activeOrders } = await supabase
        .from('orders')
        .select('*')
        .not('status', 'eq', 'delivered')
        .in('account_id', mockAccountIds);

      const orders = activeOrders || [];

      for (const order of orders) {
        // Only progress if it is a mock carrier or we have a tracking number
        if (order.tracking_number) {
          const oldStatus = order.status;
          
          // Progress status
          const { status: newStatus, history: newHistory, deliveryDate } = progressMockTracking(
            order.status,
            order.tracking_history,
            order.retailer
          );

          if (oldStatus !== newStatus) {
            // Update DB
            const { data: updatedOrder } = await supabase
              .from('orders')
              .update({
                status: newStatus,
                tracking_history: newHistory,
                delivery_date: deliveryDate
              })
              .eq('id', order.id)
              .select()
              .single();

            // Send webhook alert
            if (updatedOrder) {
              const latestEvent = newHistory[newHistory.length - 1];
              await sendDiscordNotification(
                webhookUrl,
                updatedOrder,
                oldStatus,
                newStatus,
                latestEvent?.details || 'Carrier updated shipment state.'
              );
            }
          }
        }
      }
      return { activeOrdersChecked: orders.length };
    });

    return {
      message: 'Sync process completed successfully.',
      durationMs: Date.now() - startTime,
      accountsSynced: results
    };
  }
);
