import * as cheerio from 'cheerio';
import { ParsedOrder, EmailType, OrderItem, OrderStatus, ShippingInfo } from '../types';

/**
 * Decodes quoted-printable content if needed.
 */
function decodeQP(html: string): string {
  return html.replace(/=\r\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function parseCurrency(str: string): number {
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

/**
 * Parse EB Games / GameStop CA order emails.
 *
 * Email types handled:
 *  - Order Created  ("Order Request Receipt Acknowledgement")
 *  - Shipping / Accepted  ("Order has been accepted and shipped")
 *  - Cancellation / Rejection
 *
 * Order number format: 7-digit number, e.g. "7112497"
 * Items appear in an HTML table with columns: Product code | Product name | Platform | Quantity | Price
 * Tracking: Purolator URL with ?pin=XXXXXXXXXX, or Canada Post link
 */
export function parseEBGames(
  subject: string,
  _fromAddress: string,
  htmlContent: string,
  type: EmailType
): ParsedOrder {
  const $ = cheerio.load(decodeQP(htmlContent));
  const text = $('body').text().replace(/\s+/g, ' ');

  // ---- Order number  (7 digits, preceded by "Order " or "Order number:") ----
  let orderNumber = 'UNKNOWN';
  const orderMatch =
    text.match(/Order\s+number[:\s]+(\d{5,10})\b/i) ??
    text.match(/Order\s+(\d{5,10})\b/i) ??
    subject.match(/Order\s+(?:number)?[:\s#]*(\d{5,10})\b/i);
  if (orderMatch) orderNumber = orderMatch[1];

  // ---- Carrier / tracking ----
  const links: string[] = [];
  $('a[href]').each((_, el) => { links.push($(el).attr('href') ?? ''); });

  let trackingNumber: string | null = null;
  let carrier = 'unknown';
  let trackingUrl: string | null = null;

  // Check for store pickup
  const isStorePickup =
    /pick\s*up\s*at\s*store|ready\s*for\s*pickup|in-store\s*pickup/i.test(text);

  if (isStorePickup) {
    carrier = 'in_store_pickup';
  } else {
    // Purolator link: ?pin=XXXXXXXX
    const purolatorMatch = links.concat([text]).join('\n').match(/purolator\.com[^"'\s]*[?&]pin=([A-Z0-9]+)/i);
    if (purolatorMatch) {
      trackingNumber = purolatorMatch[1];
      carrier = 'Purolator';
      trackingUrl = `https://www.purolator.com/en/ship-track/tracking-details.page?pin=${trackingNumber}`;
    }

    // Canada Post - link in email or 16-digit number
    if (!trackingNumber && /canada\s*post/i.test(text + links.join(' '))) {
      const cpMatch = text.match(/\b(\d{16})\b/);
      if (cpMatch) {
        trackingNumber = cpMatch[1];
        carrier = 'Canada Post';
        trackingUrl = `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${trackingNumber}`;
      } else {
        carrier = 'Canada Post';
      }
    }

    // UPS fallback
    if (!trackingNumber) {
      const upsMatch = text.match(/\b(1Z[A-Z0-9]{16})\b/i);
      if (upsMatch) {
        trackingNumber = upsMatch[1];
        carrier = 'UPS';
        trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
      }
    }
  }

  // ---- Items - parse the product table ----
  // Table structure: Product code | Product name | Platform | Quantity | Price
  const items: OrderItem[] = [];
  $('table tbody tr, table tr').each((_, row) => {
    const cells = $(row)
      .find('td')
      .map((_, td) => $(td).text().trim())
      .get();

    if (cells.length >= 4) {
      // Heuristic: first cell looks like a numeric SKU, second is product name
      const skuCell = cells[0];
      const nameCell = cells[1];
      const qtyCell = cells[cells.length - 2]; // second to last
      const priceCell = cells[cells.length - 1]; // last

      if (/^\d{5,8}$/.test(skuCell.trim()) && nameCell.length > 3) {
        const price = parseCurrency(priceCell);
        const qty = parseInt(qtyCell, 10) || 1;
        const name = nameCell.replace(/\(New\)|\(Pre-?[Oo]wned\)/g, '').replace(/\s+/g, ' ').trim();

        if (price > 0 && !items.some((i) => i.name === name)) {
          items.push({
            name,
            sku: skuCell.trim(),
            quantity: qty,
            unit_price: price,
            item_status: 'ok',
          });
        }
      }
    }
  });

  // Fallback: plain text parsing  "SKU  Product name  Platform  Quantity  $ Price"
  if (items.length === 0) {
    // Pattern seen in EB Games shipping emails:
    // "884750 Pokemon Trading Card Game: First Partner ... Trading Cards 1 $ 34.99"
    const rowRe = /(\d{5,8})\s+(.{10,100?}?)\s+(?:Trading Cards?|Xbox|PlayStation|Switch|PC|Other)\s+(\d+)\s+\$\s*([\d.,]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(text)) !== null) {
      const name = m[2].replace(/\s+/g, ' ').trim();
      if (!items.some((i) => i.name === name)) {
        items.push({
          name,
          sku: m[1],
          quantity: parseInt(m[3]) || 1,
          unit_price: parseCurrency(m[4]),
          item_status: 'ok',
        });
      }
    }
  }

  // ---- Total ----
  let total = 0;
  const totalMatch = text.match(/\bTotal\s+\$\s*([\d,]+\.?\d*)/i);
  if (totalMatch) total = parseCurrency(totalMatch[1]);
  if (total === 0 && items.length > 0) {
    total = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  }

  // ---- Status ----
  let status: OrderStatus = 'pending';
  if (type === 'cancellation' || /reject|cancel/i.test(subject)) {
    status = 'cancelled';
  } else if (type === 'delivery') {
    status = 'delivered';
  } else if (type === 'shipment' || /shipped|accepted\s+and\s+shipped/i.test(text)) {
    status = 'shipped';
  }

  const isShipmentEmail = type === 'shipment' || type === 'delivery';

  return {
    retailer: 'EB Games',
    orderNumber,
    status,
    items,
    total,
    currency: 'CAD',
    shipping:
      trackingNumber || isStorePickup
        ? {
            carrier: carrier as ShippingInfo['carrier'],
            tracking_number: trackingNumber,
            tracking_url: trackingUrl,
            estimated_delivery: null,
            shipped_date: isShipmentEmail ? new Date().toISOString() : null,
          }
        : null,
    isShipmentEmail,
  };
}
