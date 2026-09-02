import { ParsedOrder, EmailType } from './types';
import { parseAmazon } from './parsers/amazon';
import { parseBestBuy } from './parsers/bestbuy';
import { parseNike } from './parsers/nike';
import { parseTarget } from './parsers/target';
import { parsePokemonCenter } from './parsers/pokemon_center';
import { parseEBGames } from './parsers/ebgames';
import { parseWalmart } from './parsers/walmart';

export function classifyEmail(subject: string, fromAddress: string): { retailer: string; type: EmailType } {
  const combined = `${subject} ${fromAddress}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Identify Retailer
  let retailer = 'generic';
  if (
    combined.includes('pokemoncenter.com') ||
    combined.includes('pokemon_center') ||
    combined.includes('em.pokemon.com') ||
    combined.includes('pokemon.com') ||
    combined.includes('pokemon center') ||
    combined.includes('pokemon') ||
    // Salesforce Marketing Cloud subdomain used by Pokemon Center
    (combined.includes('pokemon') && combined.includes('s12.y.mc.salesforce.com'))
  ) {
    retailer = 'pokemon_center';
  } else if (combined.includes('ebgames.ca') || combined.includes('gamestop.com')) {
    retailer = 'ebgames';
  } else if (combined.includes('walmart.com') || combined.includes('walmart')) {
    retailer = 'walmart';
  } else if (combined.includes('amazon.')) {
    retailer = 'amazon';
  } else if (combined.includes('nike.com') || combined.includes('nike')) {
    retailer = 'nike';
  } else if (combined.includes('bestbuy.com') || combined.includes('best buy')) {
    retailer = 'bestbuy';
  } else if (combined.includes('target.com') || combined.includes('target')) {
    retailer = 'target';
  } else {
    // Attempt general domain extraction
    const match = fromAddress.match(/@([^>]+)/);
    if (match && match[1]) {
      const parts = match[1].split('.');
      if (parts.length >= 2) {
        retailer = parts[parts.length - 2].toLowerCase();
      }
    }
  }

  // 2. Identify Email Type
  let type: EmailType = 'order_confirmation';
  const subj = subject.toLowerCase();
  
  if (subj.includes('delivered')) {
    type = 'delivery';
  } else if (
    subj.includes('shipped') ||
    subj.includes('on its way') ||
    subj.includes('tracking') ||
    subj.includes('on the way') ||
    subj.includes('on the move')
  ) {
    type = 'shipment';
  } else if (subj.includes('backorder') || subj.includes('delay') || subj.includes('delayed')) {
    type = 'backorder_update';
  } else if (subj.includes('cancel') || subj.includes('refund')) {
    type = 'cancellation';
  } else if (subj.includes('confirm') || subj.includes('thank you') || subj.includes('received')) {
    type = 'order_confirmation';
  }

  return { retailer, type };
}

export function routeAndParse(
  subject: string,
  fromAddress: string,
  htmlContent: string,
  meta?: { deliveredTo?: string; originalTo?: string; receivedDate?: string }
): ParsedOrder | null {
  const { retailer, type } = classifyEmail(subject, fromAddress);

  const supportedRetailers = ['amazon', 'bestbuy', 'nike', 'target', 'pokemon_center', 'ebgames', 'walmart'];
  if (!supportedRetailers.includes(retailer)) {
    return null;
  }

  let parsed: ParsedOrder;
  switch (retailer) {
    case 'amazon':
      parsed = parseAmazon(subject, fromAddress, htmlContent, type);
      break;
    case 'bestbuy':
      parsed = parseBestBuy(subject, fromAddress, htmlContent, type);
      break;
    case 'nike':
      parsed = parseNike(subject, fromAddress, htmlContent, type);
      break;
    case 'target':
      parsed = parseTarget(subject, fromAddress, htmlContent, type);
      break;
    case 'pokemon_center':
      parsed = parsePokemonCenter(subject, fromAddress, htmlContent, type);
      break;
    case 'ebgames':
      parsed = parseEBGames(subject, fromAddress, htmlContent, type);
      break;
    case 'walmart':
      parsed = parseWalmart(subject, fromAddress, htmlContent, type);
      break;
    default:
      return null;
  }

  // Attach forwarding metadata from email headers to every parsed order
  if (meta) {
    if (meta.deliveredTo) parsed.deliveredTo = meta.deliveredTo;
    if (meta.originalTo) parsed.originalRecipient = meta.originalTo;
    if (meta.receivedDate) parsed.receivedDate = meta.receivedDate;
  }

  return parsed;
}


// Simple generic fallback parser
function parseGeneric(subject: string, fromAddress: string, htmlContent: string, type: EmailType): ParsedOrder {
  const isShipment = type === 'shipment' || type === 'delivery';
  
  // Try generic order number regex: order # followed by alphanumeric string
  let orderNumber = 'UNKNOWN';
  const orderMatch = subject.match(/order\s*#?\s*([A-Z0-9-]+)/i) || htmlContent.match(/order\s*(?:number|id)?\s*#?\s*([A-Z0-9-]+)/i);
  if (orderMatch && orderMatch[1]) {
    orderNumber = orderMatch[1];
  }

  // Try generic tracking regex (UPS, USPS)
  let trackingNumber: string | null = null;
  let carrier: any = 'unknown';
  const upsMatch = htmlContent.match(/\b(1Z[A-Z0-9]{16})\b/i);
  const uspsMatch = htmlContent.match(/\b(94[0-9]{20})\b/);
  
  if (upsMatch) {
    trackingNumber = upsMatch[0];
    carrier = 'UPS';
  } else if (uspsMatch) {
    trackingNumber = uspsMatch[0];
    carrier = 'USPS';
  }

  return {
    retailer: 'Generic Store',
    orderNumber,
    status: type === 'delivery' ? 'delivered' : isShipment ? 'shipped' : 'pending',
    items: [],
    total: 0,
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
