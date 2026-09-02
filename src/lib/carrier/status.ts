export interface TrackingEvent {
  status: string;
  details: string;
  location: string;
  timestamp: string;
}

export function getTrackingUrl(carrier: string | null, trackingNumber: string | null): string {
  if (!carrier || !trackingNumber) return '#';

  switch (carrier.toUpperCase()) {
    case 'USPS':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    case 'UPS':
      return `https://www.ups.com/track?HTMLVersion=5.0&loc=en_US&Requester=NES&trackNums=${trackingNumber}/trackdetails`;
    case 'FEDEX':
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    case 'DHL':
      return `https://www.dhl.com/en/express/tracking.shtml?AWB=${trackingNumber}`;
    default:
      return '#';
  }
}

// Progresses a tracking status to the next state for the mock carrier
export function progressMockTracking(
  currentStatus: string,
  history: TrackingEvent[],
  retailer: string
): { status: string; history: TrackingEvent[]; deliveryDate: string | null } {
  const statuses = ['pending', 'shipped', 'delivered'];
  const currentIndex = statuses.indexOf(currentStatus.toLowerCase());

  // If already delivered or invalid, don't progress
  if (currentIndex === -1 || currentStatus.toLowerCase() === 'delivered') {
    return {
      status: currentStatus,
      history,
      deliveryDate: history[history.length - 1]?.timestamp || null
    };
  }

  const nextStatus = statuses[currentIndex + 1];
  const now = new Date();
  
  // Generate location and detail text based on status
  let details = '';
  let location = '';

  switch (nextStatus) {
    case 'shipped':
      details = 'Shipment info received. Package picked up by carrier.';
      location = `${retailer} Fulfillment Center`;
      break;
    case 'delivered':
      details = 'Package delivered. Left at front porch. Sign-off: Front door.';
      location = 'Residence Front Door';
      break;
    default:
      details = 'Package status updated.';
      location = 'Sort Facility';
  }

  const newEvent: TrackingEvent = {
    status: nextStatus,
    details,
    location,
    timestamp: now.toISOString()
  };

  const updatedHistory = [...history, newEvent];

  return {
    status: nextStatus,
    history: updatedHistory,
    deliveryDate: nextStatus === 'delivered' ? now.toISOString() : null
  };
}

export function initializeMockTracking(retailer: string): TrackingEvent[] {
  return [
    {
      status: 'pending',
      details: 'Order placed. Retailer preparing items for shipment.',
      location: `${retailer} Warehouse`,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
  ];
}
