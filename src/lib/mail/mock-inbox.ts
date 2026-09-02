export interface MockEmail {
  id: string;
  from: string;
  subject: string;
  date: string;
  html: string;
}

export function generateMockEmails(speedMultiplier: number = 1): MockEmail[] {
  const now = new Date();
  
  // Create relative dates based on current time
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const justNow = now.toISOString();

  return [
    {
      id: "mock_email_amazon_1",
      from: "auto-confirm@amazon.com",
      subject: "Amazon.com order confirmation - Order #114-4982734-9281742",
      date: twoDaysAgo,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #FF9900;">Amazon.com Order Confirmation</h2>
          <p>Hello,</p>
          <p>Thank you for shopping with us. We'll send a confirmation when your items ship.</p>
          <div style="background-color: #f3f3f3; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p><strong>Order #114-4982734-9281742</strong></p>
            <p>Placed on: ${new Date(twoDaysAgo).toLocaleDateString()}</p>
          </div>
          <h3>Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #ccc;">
                <th style="text-align: left; padding: 8px;">Item</th>
                <th style="text-align: center; padding: 8px;">Qty</th>
                <th style="text-align: right; padding: 8px;">Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px;">Sony WH-1000XM4 Wireless Noise Canceling Headphones (Black)</td>
                <td style="text-align: center; padding: 8px;">1</td>
                <td style="text-align: right; padding: 8px;">$278.00</td>
              </tr>
              <tr>
                <td style="padding: 8px;">USB-C Fast Charging Cable (6ft)</td>
                <td style="text-align: center; padding: 8px;">2</td>
                <td style="text-align: right; padding: 8px;">$12.99</td>
              </tr>
            </tbody>
          </table>
          <hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;" />
          <div style="text-align: right;">
            <p>Item Subtotal: $303.98</p>
            <p>Shipping & Handling: $0.00</p>
            <p><strong>Order Total: $303.98</strong></p>
          </div>
        </div>
      `
    },
    {
      id: "mock_email_amazon_1_ship",
      from: "shipment-tracking@amazon.com",
      subject: "Your Amazon.com order #114-4982734-9281742 has shipped",
      date: oneDayAgo,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #FF9900;">Your package is on its way!</h2>
          <p>Your order #114-4982734-9281742 has been shipped. It is being tracked by USPS.</p>
          <div style="background-color: #f3f3f3; padding: 15px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #FF9900;">
            <p><strong>Carrier:</strong> USPS</p>
            <p><strong>Tracking Number:</strong> 9400111202567293817263</p>
            <p><strong>Estimated Delivery:</strong> In 2 days</p>
          </div>
          <h3>Shipped Items</h3>
          <ul>
            <li>Sony WH-1000XM4 Wireless Noise Canceling Headphones (Black)</li>
            <li>USB-C Fast Charging Cable (6ft)</li>
          </ul>
        </div>
      `
    },
    {
      id: "mock_email_bestbuy_1",
      from: "BestBuyInfo@emailinfo.bestbuy.com",
      subject: "Order Received: #BBY-9827364152 - Thank you for your order!",
      date: oneDayAgo,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #e0e0e0;">
          <div style="background-color: #0046be; padding: 15px; text-align: center; color: white;">
            <h1>BEST BUY</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Thanks for your order!</h2>
            <p>We've received your order #BBY-9827364152. We will let you know as soon as it ships or is ready for pickup.</p>
            <hr />
            <p><strong>Order Number:</strong> BBY-9827364152</p>
            <p><strong>Order Date:</strong> ${new Date(oneDayAgo).toLocaleDateString()}</p>
            <h3>Items in your order:</h3>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
              <span>Apple iPad Air 11-Inch (M2) Wi-Fi 128GB (Space Gray)</span>
              <strong>$599.00</strong>
            </div>
            <div style="text-align: right; padding-top: 15px;">
              <p>Subtotal: $599.00</p>
              <p>Tax: $47.92</p>
              <p><strong>Total: $646.92</strong></p>
            </div>
          </div>
        </div>
      `
    },
    {
      id: "mock_email_bestbuy_1_ship",
      from: "BestBuyShipping@emailinfo.bestbuy.com",
      subject: "Your Best Buy Order #BBY-9827364152 has shipped!",
      date: twelveHoursAgo,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #e0e0e0;">
          <div style="background-color: #0046be; padding: 15px; text-align: center; color: white;">
            <h1>BEST BUY</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Your order is on the way!</h2>
            <p>Great news! The items listed below are on their way. You can track your shipment using the tracking number below.</p>
            <div style="background-color: #f7f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p><strong>Shipped via:</strong> UPS</p>
              <p><strong>Tracking Number:</strong> 1Z999AA10123456784</p>
            </div>
            <p><strong>Items shipped:</strong></p>
            <p>- Apple iPad Air 11-Inch (M2) Wi-Fi 128GB (Space Gray) x 1</p>
          </div>
        </div>
      `
    },
    {
      id: "mock_email_nike_1",
      from: "nike@official.nike.com",
      subject: "Nike Order Confirmation - Order #NK88273615",
      date: twelveHoursAgo,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
          <div style="text-align: center; padding: 20px 0;">
            <svg height="24" width="60" viewBox="0 0 24 24"><path d="M21 6.5c-2.3 1.8-6.1 4.5-9.3 6.3-2.6 1.5-4.8 2.2-6.5 2.2-1 0-1.7-.2-2-.6-.2-.3-.1-.9.4-1.8.8-1.5 2.6-4.1 4-5.6.3-.3.1-.5-.3-.4-1.3.4-3.7 1.8-5.3 3.6-1.5 1.7-2 3.5-1.4 4.8.5 1.1 1.9 1.8 3.9 1.8 2.9 0 6.2-1.6 9.8-3.9 3.6-2.3 8.3-6.1 10.9-8.4.3-.2.1-.6-.2-.5z"/></svg>
          </div>
          <h2>GET READY, YOUR ORDER IS CONFIRMED.</h2>
          <p>Thanks for your order, John Smith. We'll let you know when it's headed your way.</p>
          <div style="border-top: 2px solid #111; border-bottom: 2px solid #111; padding: 15px 0; margin: 20px 0;">
            <p><strong>Order Number:</strong> NK88273615</p>
            <p><strong>Order Date:</strong> ${new Date(twelveHoursAgo).toLocaleDateString()}</p>
          </div>
          <h3>YOUR ITEMS</h3>
          <div style="display: flex; margin-bottom: 15px;">
            <div style="margin-left: 15px;">
              <p><strong>Nike Air Max Plus</strong></p>
              <p>Size: 10.5 | Color: Black/Volt</p>
              <p>Qty: 1 @ $180.00</p>
            </div>
          </div>
          <hr />
          <p style="text-align: right;"><strong>Total: $180.00</strong></p>
        </div>
      `
    },
    {
      id: "mock_email_nike_1_ship",
      from: "nike@official.nike.com",
      subject: "Your Nike Order #NK88273615 has shipped!",
      date: justNow,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
          <div style="text-align: center; padding: 20px 0;">
            <svg height="24" width="60" viewBox="0 0 24 24"><path d="M21 6.5c-2.3 1.8-6.1 4.5-9.3 6.3-2.6 1.5-4.8 2.2-6.5 2.2-1 0-1.7-.2-2-.6-.2-.3-.1-.9.4-1.8.8-1.5 2.6-4.1 4-5.6.3-.3.1-.5-.3-.4-1.3.4-3.7 1.8-5.3 3.6-1.5 1.7-2 3.5-1.4 4.8.5 1.1 1.9 1.8 3.9 1.8 2.9 0 6.2-1.6 9.8-3.9 3.6-2.3 8.3-6.1 10.9-8.4.3-.2.1-.6-.2-.5z"/></svg>
          </div>
          <h2>YOUR ORDER IS ON THE WAY.</h2>
          <p>John Smith, your order NK88273615 has been shipped. It is being carried by FedEx.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
            <p><strong>Tracking Number:</strong> 782937482910</p>
            <p><strong>Carrier:</strong> FedEx</p>
          </div>
          <h3>ITEMS SHIPPED</h3>
          <p>- Nike Air Max Plus x 1</p>
        </div>
      `
    }
  ];
}
