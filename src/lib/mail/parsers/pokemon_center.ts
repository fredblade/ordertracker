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
 * Parse Pokémon Center order emails.
 *
 * Order number format: "P" + 10 digits, e.g. "P0037521238"
 * Items: "SKU #: XX-XXXXX-XXX  Qty: N  Price: $XX.XX CAD"
 * Order total: "Order Total $XXX.XX CAD"
 * Carrier: typically UPS, USPS, or Canada Post depending on region
 *
 * Email types:
 *  - Order confirmation / preorder  ("Thank you for placing a preorder")
 *  - Action required / payment issue  ("We're unable to authorize your credit card")
 *  - Shipment  (contains tracking info)
 */
export function parsePokemonCenter(
  subject: string,
  _fromAddress: string,
  htmlContent: string,
  type: EmailType
): ParsedOrder {
  const $ = cheerio.load(decodeQP(htmlContent));
  const text = $('body').text().replace(/\s+/g, ' ');

  // ---- Order number  (P + 10 digits) ----
  let orderNumber = 'UNKNOWN';
  const orderMatch =
    text.match(/Order\s+(?:Number|#|ID)[:\s]*(P\d{8,12})\b/i) ??
    text.match(/Order\s+(?:Number|#|ID)[:\s]*(\d{8,12})\b/i);
  if (orderMatch) orderNumber = orderMatch[1];

  // ---- Carrier / tracking ----
  const links: string[] = [];
  $('a[href]').each((_, el) => { links.push($(el).attr('href') ?? ''); });

  let trackingNumber: string | null = null;
  let carrier = 'unknown';
  let trackingUrl: string | null = null;

  // UPS
  const upsMatch = text.match(/\b(1Z[A-Z0-9]{16})\b/i);
  if (upsMatch) {
    trackingNumber = upsMatch[1];
    carrier = 'UPS';
    trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
  }

  // Purolator (Canadian orders)
  if (!trackingNumber) {
    const purolatorMatch = links.concat([text]).join('\n').match(/purolator\.com[^"'\s]*[?&]pin=([A-Z0-9]+)/i);
    if (purolatorMatch) {
      trackingNumber = purolatorMatch[1];
      carrier = 'Purolator';
      trackingUrl = `https://www.purolator.com/en/ship-track/tracking-details.page?pin=${trackingNumber}`;
    }
  }

  // USPS
  if (!trackingNumber) {
    const uspsMatch = text.match(/\b(94\d{20})\b/);
    if (uspsMatch) {
      trackingNumber = uspsMatch[1];
      carrier = 'USPS';
      trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`;
    }
  }

  // FedEx (12 or 15 digits + "FedEx" mention)
  if (!trackingNumber && /fedex/i.test(text)) {
    const fxMatch = text.match(/\b(\d{12}|\d{15})\b/);
    if (fxMatch) {
      trackingNumber = fxMatch[1];
      carrier = 'FedEx';
      trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    }
  }

  // Canada Post
  if (!trackingNumber && /canada\s*post/i.test(text)) {
    const cpMatch = text.match(/\b(\d{16})\b/);
    if (cpMatch) {
      trackingNumber = cpMatch[1];
      carrier = 'Canada Post';
      trackingUrl = `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${trackingNumber}`;
    }
  }

  // Fallback for general tracking number in text
  if (!trackingNumber) {
    const trackingMatch = text.match(/Tracking\s+Number[:\s]*([A-Z0-9]+)/i);
    if (trackingMatch) {
      const matchVal = trackingMatch[1];
      if (/^1Z[A-Z0-9]{16}$/i.test(matchVal)) {
        trackingNumber = matchVal;
        carrier = 'UPS';
        trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
      } else if (/^\d{12}$/.test(matchVal) || /^\d{15}$/.test(matchVal)) {
        trackingNumber = matchVal;
        carrier = 'FedEx';
        trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
      } else if (/^\d{20}$/.test(matchVal) || /^\d{22}$/.test(matchVal)) {
        trackingNumber = matchVal;
        carrier = 'USPS';
        trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`;
      } else if (/^\d{16}$/.test(matchVal)) {
        trackingNumber = matchVal;
        carrier = 'Canada Post';
        trackingUrl = `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${trackingNumber}`;
      }
    }
  }

  // ---- Items ----
  // Pattern: "PRODUCT NAME SKU #: XX-XXXXX-XXX Qty: N Price: $XX.XX CAD"
  const items: OrderItem[] = [];
  const itemRe =
    /([A-Z][^$\n]{5,200}?)\s+SKU\s*#?:\s*([\w-]+)\s+Qty:\s*(\d+)(?:\s+Price:\s*\$([\d,]+\.?\d*))?/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(text)) !== null) {
    let name = m[1].replace(/\s+/g, ' ').trim();
    const markers = ['Order Summary', 'Order Details', 'Shipping Details', 'Billing Address', 'Shipping Address'];
    for (const marker of markers) {
      const idx = name.indexOf(marker);
      if (idx !== -1) {
        name = name.substring(idx + marker.length).trim();
      }
    }
    const eaIdx = name.lastIndexOf('ea.');
    if (eaIdx !== -1) {
      name = name.substring(eaIdx + 'ea.'.length).trim();
    }
    const qtyMatch = name.match(/Qty:\s*\d+/gi);
    if (qtyMatch) {
      const lastQty = qtyMatch[qtyMatch.length - 1];
      const qtyIdx = name.lastIndexOf(lastQty);
      name = name.substring(qtyIdx + lastQty.length).trim();
    }

    const sku = m[2];
    const qty = parseInt(m[3]) || 1;
    const price = m[4] ? parseCurrency(m[4]) : 0;
    if (!items.some((i) => i.name === name)) {
      items.push({
        name,
        sku,
        quantity: qty,
        unit_price: price,
        item_status: type === 'backorder_update' ? 'backordered' : 'ok',
      });
    }
  }

  // Fallback: look for "Pokémon TCG: ..." product names near prices
  if (items.length === 0) {
    const fallbackRe = /(Pok[eé]mon\s+TCG:[^$\n]{5,120?})\s+\$([\d,]+\.?\d*)/gi;
    while ((m = fallbackRe.exec(text)) !== null) {
      const name = m[1].replace(/\s+/g, ' ').trim();
      if (!items.some((i) => i.name === name)) {
        items.push({
          name,
          sku: null,
          quantity: 1,
          unit_price: parseCurrency(m[2]),
          item_status: type === 'backorder_update' ? 'backordered' : 'ok',
        });
      }
    }
  }

  // Fallback: look for "Pokémon TCG: ..." listed in preorders without SKU
  if (items.length === 0) {
    const preorderMatch = text.match(/(?:preorder|shipment of your preorder)\s+([^.]+?)\.\s*(?:However|Please)/i);
    if (preorderMatch) {
      const itemsListStr = preorderMatch[1];
      const itemNames = itemsListStr.split(/,\s+(?=Pok[eé]mon)/gi);
      for (const name of itemNames) {
        const trimmedName = name.trim();
        if (trimmedName && !items.some((i) => i.name === trimmedName)) {
          items.push({
            name: trimmedName,
            sku: null,
            quantity: 1,
            unit_price: 0,
            item_status: 'ok',
          });
        }
      }
    }
  }

  // ---- Total ----
  let total = 0;
  const totalMatch =
    text.match(/Order\s+Total\s+\$([\d,]+\.?\d*)/i) ??
    text.match(/Order\s+Subtotal[:\s]*\$([\d,]+\.?\d*)/i) ??
    text.match(/Subtotal[:\s]*\$([\d,]+\.?\d*)/i);
  if (totalMatch) total = parseCurrency(totalMatch[1]);
  if (total === 0 && items.length > 0) {
    total = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  }

  // ---- Status ----
  let status: OrderStatus = 'pending';
  if (type === 'cancellation' || /cancel/i.test(subject)) {
    status = 'cancelled';
  } else if (type === 'delivery') {
    status = 'delivered';
  } else if (type === 'shipment') {
    status = 'shipped';
  }

  const isShipmentEmail = type === 'shipment' || type === 'delivery';

  return {
    retailer: 'Pokemon Center',
    orderNumber,
    status,
    items,
    total,
    currency: 'CAD',
    shipping: trackingNumber
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
