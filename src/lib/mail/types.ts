export interface OrderItem {
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  item_status: 'ok' | 'backordered' | 'cancelled' | 'substituted';
}

export interface ShippingInfo {
  carrier: 'USPS' | 'UPS' | 'FedEx' | 'OnTrac' | 'DHL' | 'Canada Post' | 'Purolator' | 'Intelcom' | 'Walmart Last Mile' | 'in_store_pickup' | 'unknown';
  tracking_number: string | null;
  tracking_url: string | null;
  estimated_delivery: string | null; // ISO date string
  shipped_date: string | null;      // ISO date string
}

export type OrderStatus =
  | 'pending'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'action_required';

export interface ParsedOrder {
  retailer: string;
  orderNumber: string;
  orderDate?: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  currency: string;
  shipping: ShippingInfo | null;
  isShipmentEmail: boolean;
  /** The Gmail/real inbox address this email was ultimately delivered to (Delivered-To header) */
  deliveredTo?: string;
  /** The original To: address (e.g. the catch-all address the email was sent to) */
  originalRecipient?: string;
  /** Raw received date from email headers */
  receivedDate?: string;
}

export type EmailType =
  | 'order_confirmation'
  | 'shipment'
  | 'delivery'
  | 'backorder_update'
  | 'cancellation';
