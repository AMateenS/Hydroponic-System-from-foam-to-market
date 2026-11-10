// Every template returns { subject, text, html }. User-supplied text is HTML-escaped.
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;
const orderCode = (order) => `ORD-${String(order._id).slice(-6).toUpperCase()}`;
const siteUrl = () => (process.env.CLIENT_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");

const wrap = (title, inner) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#111827">
  <div style="background:#16a34a;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">Agro-IntelliSense</h2>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:20px;border-radius:0 0 8px 8px">
    <h3 style="margin-top:0">${esc(title)}</h3>
    ${inner}
    <p style="color:#6b7280;font-size:12px;margin-top:24px">This is an automated message. Please do not reply.</p>
  </div>
</div>`;

const paymentLine = (order) => {
  if (order.paymentMethod === "card") {
    return order.paymentStatus === "paid" ? "Paid online by card" : "Online card payment (awaiting payment)";
  }
  return "Cash on delivery";
};

const itemsHtml = (order) => `
<table style="width:100%;border-collapse:collapse;font-size:14px">
  ${order.items
    .map(
      (i) => `<tr>
    <td style="padding:6px 0;border-bottom:1px solid #f3f4f6">${esc(i.name)} × ${esc(i.qty)} ${esc(i.unit)}</td>
    <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;text-align:right">${money(i.price * i.qty)}</td>
  </tr>`
    )
    .join("")}
  <tr><td style="padding:8px 0;font-weight:bold">Total</td><td style="padding:8px 0;font-weight:bold;text-align:right">${money(order.totalAmount)}</td></tr>
</table>`;

const itemsText = (order) =>
  order.items.map((i) => `- ${i.name} x ${i.qty} ${i.unit || ""}: ${money(i.price * i.qty)}`).join("\n");

const deliveryHtml = (order) => `
<p style="font-size:14px"><strong>Deliver to:</strong><br>
${esc(order.customerDetails.name)}<br>${esc(order.customerDetails.phone)}<br>${esc(order.customerDetails.location)}</p>`;

const orderLink = (order) => `${siteUrl()}/orders/${order._id}`;

exports.orderConfirmationEmail = (order, user) => ({
  subject: `Order ${orderCode(order)} confirmed`,
  text: `Hi ${user?.username || "there"},\n\nThank you for your order ${orderCode(order)}.\n\n${itemsText(order)}\n\nTotal: ${money(
    order.totalAmount
  )}\nPayment: ${paymentLine(order)}\nDeliver to: ${order.customerDetails.name}, ${order.customerDetails.phone}, ${
    order.customerDetails.location
  }\n\nView your order: ${orderLink(order)}`,
  html: wrap(
    `Thank you for your order, ${user?.username || ""}!`,
    `<p>Your order <strong>${orderCode(order)}</strong> has been received.</p>
     ${itemsHtml(order)}
     <p style="font-size:14px"><strong>Payment:</strong> ${esc(paymentLine(order))}</p>
     ${deliveryHtml(order)}
     <p><a href="${orderLink(order)}" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View order</a></p>`
  ),
});

exports.orderStatusEmail = (order, user) => ({
  subject: `Order ${orderCode(order)} is now ${order.status}`,
  text: `Hi ${user?.username || "there"}, the status of your order ${orderCode(order)} is now: ${order.status}.\n\nView your order: ${orderLink(order)}`,
  html: wrap(
    `Your order is ${order.status}`,
    `<p>Hi ${esc(user?.username || "there")}, the status of order <strong>${orderCode(order)}</strong> is now <strong>${esc(
      order.status
    )}</strong>.</p>
     <p><a href="${orderLink(order)}" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View order</a></p>`
  ),
});

exports.adminNewOrderEmail = (order, user) => ({
  subject: `New order ${orderCode(order)} (${money(order.totalAmount)})`,
  text: `New order ${orderCode(order)} from ${user?.username || "a customer"} (${user?.email || "no email"}).\n\n${itemsText(order)}\n\nTotal: ${money(
    order.totalAmount
  )}\nPayment: ${paymentLine(order)}`,
  html: wrap(
    `New order ${orderCode(order)}`,
    `<p>From <strong>${esc(user?.username || "a customer")}</strong> (${esc(user?.email || "no email")})</p>
     ${itemsHtml(order)}
     <p style="font-size:14px"><strong>Payment:</strong> ${esc(paymentLine(order))}</p>
     ${deliveryHtml(order)}
     <p><a href="${siteUrl()}/admin/orders/${order._id}">Open in admin panel</a></p>`
  ),
});

exports._test = { esc, money };
