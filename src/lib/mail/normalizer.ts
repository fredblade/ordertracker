import { ParsedOrder, OrderItem, ShippingInfo, OrderStatus } from './types';

export function normalizeOrderMerge(
  existingOrder: any | null,
  parsed: ParsedOrder,
  newRawEmailId?: string
): any {
  // Determine overall status merging
  let finalStatus: OrderStatus = parsed.status;
  if (existingOrder) {
    const currentStatus = existingOrder.status as OrderStatus;
    
    // Status hierarchy rules (prevent downgrading delivered or cancelled states)
    if (currentStatus === 'delivered' && parsed.status !== 'cancelled') {
      finalStatus = 'delivered';
    } else if (currentStatus === 'cancelled') {
      finalStatus = currentStatus;
    }
  }

  // Merge Items
  let finalItems: OrderItem[] = [];
  if (existingOrder && existingOrder.items && existingOrder.items.length > 0) {
    const existingItems = existingOrder.items as OrderItem[];
    
    if (parsed.items && parsed.items.length > 0) {
      // Merge: Update existing items or add new ones
      finalItems = [...existingItems];
      for (const parsedItem of parsed.items) {
        const matchIdx = finalItems.findIndex(i => i.name.toLowerCase() === parsedItem.name.toLowerCase());
        if (matchIdx > -1) {
          finalItems[matchIdx] = {
            ...finalItems[matchIdx],
            quantity: Math.max(finalItems[matchIdx].quantity, parsedItem.quantity),
            unit_price: parsedItem.unit_price || finalItems[matchIdx].unit_price,
            item_status: parsedItem.item_status
          };
        } else {
          finalItems.push(parsedItem);
        }
      }
    } else {
      // No new items in this email update, preserve existing
      finalItems = existingItems;
    }
  } else {
    // New order or empty existing items, use parsed items
    finalItems = parsed.items || [];
  }

  // Merge Shipping
  let finalShipping: ShippingInfo | null = null;
  const existingShipping = existingOrder?.shipping as ShippingInfo | null;
  const parsedShipping = parsed.shipping;

  if (existingShipping) {
    finalShipping = {
      carrier: parsedShipping?.carrier !== 'unknown' && parsedShipping?.carrier ? parsedShipping.carrier : existingShipping.carrier,
      tracking_number: parsedShipping?.tracking_number || existingShipping.tracking_number,
      tracking_url: parsedShipping?.tracking_url || existingShipping.tracking_url,
      estimated_delivery: parsedShipping?.estimated_delivery || existingShipping.estimated_delivery,
      shipped_date: parsedShipping?.shipped_date || existingShipping.shipped_date
    };
  } else {
    finalShipping = parsedShipping;
  }

  // Merge Tracking History
  let finalTrackingHistory = existingOrder?.tracking_history || [];
  const oldStatus = existingOrder?.status || 'pending';
  
  if (!existingOrder || oldStatus !== finalStatus || (parsedShipping?.tracking_number && !existingShipping?.tracking_number)) {
    let details = `Status updated to ${finalStatus.toUpperCase()}.`;
    if (parsedShipping?.tracking_number && !existingShipping?.tracking_number) {
      details = `Tracking information added: ${parsedShipping.carrier} - ${parsedShipping.tracking_number}.`;
    }
    
    finalTrackingHistory = [
      ...finalTrackingHistory,
      {
        status: finalStatus,
        details,
        location: parsed.retailer,
        timestamp: new Date().toISOString()
      }
    ];
  }

  // Merge Total
  let finalTotal = existingOrder?.total || 0;
  if (parsed.total && parsed.total > 0) {
    finalTotal = parsed.total;
  }

  // Merge Raw Email IDs
  let finalRawEmailIds: string[] = existingOrder?.raw_email_ids || [];
  if (newRawEmailId && !finalRawEmailIds.includes(newRawEmailId)) {
    finalRawEmailIds = [...finalRawEmailIds, newRawEmailId];
  }

  return {
    retailer: parsed.retailer,
    order_number: parsed.orderNumber,
    status: finalStatus,
    items: finalItems,
    shipping: finalShipping,
    tracking_number: finalShipping?.tracking_number || existingOrder?.tracking_number || null,
    carrier: finalShipping?.carrier || existingOrder?.carrier || null,
    tracking_history: finalTrackingHistory,
    currency: parsed.currency || existingOrder?.currency || 'USD',
    total: finalTotal,
    raw_email_ids: finalRawEmailIds,
    delivery_date: finalShipping?.estimated_delivery || existingOrder?.delivery_date || null
  };
}
