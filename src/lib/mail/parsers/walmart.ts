import * as cheerio from 'cheerio';
import { ParsedOrder, EmailType, OrderItem, OrderStatus, ShippingInfo } from '../types';

/**
 * Decodes quoted-printable content if needed (emails stored as raw MIME).
 * In production the content arriving from the mail hook is already decoded HTML,
 * so this is a no-op safety net.
 */
function decodeQP(html: string): string {
  return html.replace(/=\r\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

/**
 * Extract a tracking number from a URL or plain text.
 *
 * Supported carriers:
 *  - UPS:            1Z + 16 alphanumeric chars
 *  - Canada Post:    16-digit numeric
 *  - USPS:           94 + 20 digits (GS1-128)
 *  - FedEx:          12 or 15 digit numeric (only when FedEx is mentioned)
 *  - Purolator:      ?pin=XXXXXXXXXX URL param OR 12-digit numeric when Purolator is mentioned
 *  - Intelcom/other: 10-digit numeric when carrier is mentioned
 */
function extractCarrierTracking(
  text: string,
  links: string[]
): { carrier: string; trackingNumber: string | null; trackingUrl: string | null } | null {
  // -------- UPS --------
  const upsRe = /\b(1Z[A-Z0-9]{16})\b/i;
  const upsMatch = text.match(upsRe) ?? links.map((l) => l.match(upsRe)?.[1]).find(Boolean);
  if (upsMatch) {
    const tn = Array.isArray(upsMatch) ? upsMatch[1] : upsMatch;
    return { carrier: 'UPS', trackingNumber: tn, trackingUrl: `https://www.ups.com/track?tracknum=${tn}` };
  }

  // -------- Purolator - extract from ?pin= URL param --------
  const purolatorLinkMatch = links
    .concat([text])
    .join('\n')
    .match(/purolator\.com[^"'\s]*[?&]pin=([A-Z0-9]+)/i);
  if (purolatorLinkMatch) {
    const tn = purolatorLinkMatch[1];
    return {
      carrier: 'Purolator',
      trackingNumber: tn,
      trackingUrl: `https://www.purolator.com/en/ship-track/tracking-details.page?pin=${tn}`,
    };
  }

  // -------- Canada Post - 16 numeric digits --------
  if (/canada\s*post/i.test(text)) {
    const cpMatch = text.match(/\b(\d{16})\b/);
    if (cpMatch) {
      return {
        carrier: 'Canada Post',
        trackingNumber: cpMatch[1],
        trackingUrl: `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${cpMatch[1]}`,
      };
    }
  }

  // -------- USPS - 94XXXX (22 digits) --------
  const uspsMatch = text.match(/\b(94\d{20})\b/);
  if (uspsMatch) {
    return { carrier: 'USPS', trackingNumber: uspsMatch[1], trackingUrl: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${uspsMatch[1]}` };
  }

  // -------- FedEx - 12 or 15 digits when FedEx mentioned --------
  if (/fedex/i.test(text)) {
    const fxMatch = text.match(/\b(\d{12}|\d{15})\b/);
    if (fxMatch) {
      return { carrier: 'FedEx', trackingNumber: fxMatch[1], trackingUrl: `https://www.fedex.com/fedextrack/?trknbr=${fxMatch[1]}` };
    }
  }

  // -------- Intelcom --------
  if (/intelcom/i.test(text)) {
    const inMatch = text.match(/\b(\d{10,13})\b/);
    if (inMatch) {
      return { carrier: 'Intelcom', trackingNumber: inMatch[1], trackingUrl: null };
    }
  }

  // -------- Walmart last-mile (PCLDOM or last mile) - no external tracking number --------
  if (/PCLDOM|last\s*mile/i.test(text)) {
    return { carrier: 'Walmart Last Mile', trackingNumber: null, trackingUrl: null };
  }

  return null;
}

/**
 * Parse a currency string like "$1,234.56" or "$ 39.99" into a float.
 */
function parseCurrency(str: string): number {
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

// ---------------------------------------------------------------------------
// WALMART
// ---------------------------------------------------------------------------
export function parseWalmart(
  subject: string,
  _fromAddress: string,
  htmlContent: string,
  type: EmailType
): ParsedOrder {
  const $ = cheerio.load(decodeQP(htmlContent));
  const text = $('body').text().replace(/\s+/g, ' ');

  // ---- Order number  (Walmart CA: 15-digit number after "Order number:") ----
  let orderNumber = 'UNKNOWN';
  const orderMatch = text.match(/Order\s+number[:\s]*([\d]{10,16})/i);
  if (orderMatch) {
    orderNumber = orderMatch[1];
  } else {
    // Fallback: 7-7 US format or bare 13 digits
    const fallback = text.match(/\b(\d{7}-\d{7}|\d{13})\b/);
    if (fallback) orderNumber = fallback[1];
  }

  // ---- Carrier / tracking ----
  const links: string[] = [];
  $('a[href]').each((_, el) => { links.push($(el).attr('href') ?? ''); });

  const tracking = extractCarrierTracking(text, links);

  // ---- Items ----
  // Walmart items in body text: "PRODUCT NAME SKU: XXXXXXXXXXX Qty: N $XX.XX"
  const items: OrderItem[] = [];
  const itemPattern = /([A-Z][^$]{5,120?})\s+SKU:\s*\S+\s+Qty:\s*([\d.]+)\s+\$([\d,]+\.?\d*)/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemPattern.exec(text)) !== null) {
    const name = itemMatch[1].trim().replace(/\s+/g, ' ');
    const qty = parseFloat(itemMatch[2]) || 1;
    const price = parseCurrency(itemMatch[3]);
    if (!items.some((i) => i.name === name)) {
      items.push({ name, sku: null, quantity: qty, unit_price: price / qty, item_status: 'ok' });
    }
  }

  // ---- Total ----
  let total = 0;
  const totalMatch = text.match(/\bTotal\s+\$([\d,]+\.?\d*)/i);
  if (totalMatch) total = parseCurrency(totalMatch[1]);
  if (total === 0 && items.length > 0) {
    total = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  }

  // ---- Status ----
  let status: OrderStatus = 'pending';
  if (type === 'cancellation') status = 'cancelled';
  else if (type === 'delivery') status = 'delivered';
  else if (type === 'shipment') status = 'shipped';

  const isShipmentEmail = type === 'shipment' || type === 'delivery';

  return {
    retailer: 'Walmart',
    orderNumber,
    status,
    items,
    total,
    currency: 'CAD',
    shipping: tracking
      ? {
          carrier: tracking.carrier as ShippingInfo['carrier'],
          tracking_number: tracking.trackingNumber,
          tracking_url: tracking.trackingUrl,
          estimated_delivery: null,
          shipped_date: isShipmentEmail ? new Date().toISOString() : null,
        }
      : null,
    isShipmentEmail,
  };
}
