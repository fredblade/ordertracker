import * as cheerio from 'cheerio';
import { ParsedOrder, EmailType, OrderItem } from '../types';

export function parseAmazon(subject: string, fromAddress: string, htmlContent: string, type: EmailType): ParsedOrder {
  const $ = cheerio.load(htmlContent);
  const text = $('body').text() || htmlContent;
  const isShipment = type === 'shipment' || type === 'delivery';

  // Extract order number
  let orderNumber = 'UNKNOWN';
  const orderMatch = text.match(/\b\d{3}-\d{7}-\d{7}\b/);
  if (orderMatch) {
    orderNumber = orderMatch[0];
  } else {
    const fallbackMatch = subject.match(/order\s*#?\s*([A-Z0-9-]+)/i) || text.match(/order\s*(?:number|id)?\s*#?\s*([A-Z0-9-]+)/i);
    if (fallbackMatch) orderNumber = fallbackMatch[1];
  }

  // Extract tracking number & carrier
  let trackingNumber: string | null = null;
  let carrier: any = 'unknown';

  const upsMatch = text.match(/\b(1Z[A-Z0-9]{16})\b/i);
  const uspsMatch = text.match(/\b(94[0-9]{20})\b/);
  const fedexMatch = text.match(/\b(\d{12}|\d{15})\b/);

  if (upsMatch) {
    trackingNumber = upsMatch[0];
    carrier = 'UPS';
  } else if (uspsMatch) {
    trackingNumber = uspsMatch[0];
    carrier = 'USPS';
  } else if (fedexMatch && (text.includes('FedEx') || text.includes('fedex'))) {
    trackingNumber = fedexMatch[0];
    carrier = 'FedEx';
  }

  // Extract items
  const items: OrderItem[] = [];
  $('tr').each((_, elem) => {
    const nameCol = $(elem).find('td').first().text().trim();
    const qtyCol = $(elem).find('td').eq(1).text().trim();
    const priceCol = $(elem).find('td').last().text().trim();

    if (nameCol && qtyCol && priceCol && priceCol.startsWith('$')) {
      const qty = parseInt(qtyCol, 10);
      const price = parseFloat(priceCol.replace(/[^0-9.]/g, ''));
      if (!isNaN(qty) && !isNaN(price) && nameCol !== 'Item') {
        items.push({
          name: nameCol,
          sku: null,
          quantity: qty,
          unit_price: price,
          item_status: 'ok'
        });
      }
    }
  });

  let total = 0;
  const totalMatch = text.match(/order total:\s*\$([0-9.]+)/i);
  if (totalMatch) total = parseFloat(totalMatch[1]);
  if (total === 0 && items.length > 0) {
    total = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
  }

  return {
    retailer: 'Amazon',
    orderNumber,
    status: type === 'delivery' ? 'delivered' : isShipment ? 'shipped' : 'pending',
    items,
    total,
    currency: 'USD',
    shipping: trackingNumber ? {
      carrier,
      tracking_number: trackingNumber,
      tracking_url: null,
      estimated_delivery: null,
      shipped_date: isShipment ? new Date().toISOString() : null
    } : null,
    isShipmentEmail: isShipment
  };
}
