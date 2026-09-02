import { routeAndParse } from './router';

export function parseOrderEmail(subject: string, fromAddress: string, htmlContent: string) {
  const parsed = routeAndParse(subject, fromAddress, htmlContent);
  if (!parsed) return null;
  return {
    ...parsed,
    trackingNumber: parsed.shipping?.tracking_number || null,
    carrier: parsed.shipping?.carrier || null
  };
}
