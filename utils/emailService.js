const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "ritikaagrocenter2024@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Generate Bill HTML
function generateBillHTML(order, customerEmail, customerName) {
  const itemsHTML = order.items
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>₹${item.price}</td>
      <td>₹${item.qty * item.price}</td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
        .header { text-align: center; border-bottom: 3px solid #27ae60; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #27ae60; }
        .header p { margin: 5px 0; }
        .bill-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .bill-section { flex: 1; }
        .bill-section p { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #27ae60; color: white; }
        .total-section { text-align: right; margin-bottom: 20px; }
        .total-section p { margin: 5px 0; font-size: 18px; }
        .total { font-weight: bold; font-size: 20px; color: #27ae60; }
        .footer { text-align: center; color: #999; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 INVOICE</h1>
          <p>Ritika Agro Center</p>
        </div>

        <div class="bill-info">
          <div class="bill-section">
            <h3>Bill To:</h3>
            <p><strong>${customerName}</strong></p>
            <p>Email: ${customerEmail}</p>
            <p>${order.shippingAddress.address}</p>
            <p>${order.shippingAddress.phone}</p>
          </div>
          <div class="bill-section">
            <h3>Order Details:</h3>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${order.orderStatus || "Processing"}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="total-section">
          <p>Subtotal: ₹${order.totalAmount}</p>
          <p>Delivery: ₹0</p>
          <p class="total">Grand Total: ₹${order.totalAmount}</p>
        </div>

        <div class="footer">
          <p>Thank you for your business! 🌾</p>
          <p>© 2026 Ritika Agro Center - All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send Bill to Multiple Recipients
async function sendBillEmail(order, customerEmail, customerName) {
  try {
    const billHTML = generateBillHTML(order, customerEmail, customerName);

    // Recipients
    const recipients = [
      {
        email: customerEmail,
        name: customerName,
        subject: `Order Confirmation - Invoice #${order._id}`,
      },
      {
        email: process.env.SHOPKEEPER_EMAIL || "ritikaagrocentersp2024@gmail.com",
        name: "Shopkeeper",
        subject: `New Order Received - #${order._id}`,
      },
      {
        email: process.env.DELIVERY_EMAIL || "ritikaagrocenterda2024@gmail.com",
        name: "Delivery Agent",
        subject: `Delivery Assignment - Order #${order._id}`,
      },
    ];

    // Send to all recipients
    for (const recipient of recipients) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || "ritikaagrocenter2024@gmail.com",
        to: recipient.email,
        subject: recipient.subject,
        html: billHTML,
      });
      console.log(`✅ Bill sent to ${recipient.email}`);
    }

    return { success: true, message: "Invoices sent successfully" };
  } catch (error) {
    console.error("❌ Email Error:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendBillEmail };
