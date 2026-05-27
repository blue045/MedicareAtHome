function cleanEnv(value) {
  return String(value || "").trim().replace(/^[\'\"]|[\'\"]$/g, "");
}

function cleanText(value = "", max = 900) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanEmail(value = "") {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.endsWith("@phone.local") || email.endsWith("@google.local")) return "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "";
  return email;
}

function money(value) {
  const number = Number(value || 0);
  return `৳${number.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

function siteUrl(env = {}) {
  const raw = cleanEnv(env.SITE_URL || env.PUBLIC_SITE_URL || "");
  return raw.replace(/\/+$/g, "");
}

function brevoConfig(env = {}) {
  return {
    apiKey: cleanEnv(env.BREVO_API_KEY || env.SENDINBLUE_API_KEY),
    senderEmail: cleanEmail(env.BREVO_SENDER_EMAIL || env.FROM_EMAIL),
    senderName: cleanText(env.BREVO_SENDER_NAME || "Medicare At Home", 80),
    replyToEmail: cleanEmail(env.BREVO_REPLY_TO_EMAIL || env.REPLY_TO_EMAIL),
    disabled: ["0", "false", "off", "no"].includes(cleanEnv(env.BREVO_ORDER_EMAILS || "1").toLowerCase())
  };
}

export function hasBrevoConfig(env = {}) {
  const config = brevoConfig(env);
  return Boolean(!config.disabled && config.apiKey && config.senderEmail);
}

function statusLabel(status = "") {
  const labels = {
    pending: "Pending",
    pending_payment: "Pending Payment",
    payment_submitted: "Payment Submitted",
    confirmed: "Payment Confirmed",
    on_the_way: "On the Way",
    delivered: "Delivered",
    completed: "Delivered",
    cancelled: "Cancelled"
  };
  return labels[String(status || "").toLowerCase()] || "Pending";
}

function statusMessage(status = "") {
  const messages = {
    pending: "We received your order and it is waiting for review.",
    pending_payment: "Your order is waiting for delivery-fee payment verification.",
    payment_submitted: "Your payment information has been submitted and is being checked.",
    confirmed: "Your payment is confirmed. We will prepare your order next.",
    on_the_way: "Your order is now on the way.",
    delivered: "Your order has been delivered. Thank you for choosing Medicare At Home.",
    completed: "Your order has been delivered. Thank you for choosing Medicare At Home.",
    cancelled: "Your order has been cancelled. Contact us if you need help."
  };
  return messages[String(status || "").toLowerCase()] || messages.pending;
}

function orderTotal(order = {}) {
  const productAmount = order.orderType === "prescription"
    ? Number(order.productPrice || 0)
    : Number(order.productPrice || 0) * Number(order.quantity || 1);
  return productAmount + Number(order.deliveryCharge || 0);
}


function firstUrl(value = "") {
  const match = String(value || "").match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[),.;]+$/g, "") : "";
}

function stripUrls(value = "") {
  return cleanText(String(value || "").replace(/https?:\/\/\S+/gi, " "), 700) || "Not provided";
}

function emailRow(label, value, options = {}) {
  const safeLabel = escapeHtml(label);
  const safeValue = escapeHtml(value || "Not provided");
  const link = options.link ? escapeHtml(options.link) : "";
  const linkText = escapeHtml(options.linkText || "Open link");
  return `
        <div style="border-top:1px solid #e2e8f0;padding:14px 0;">
          <div style="font-size:12px;line-height:1.4;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:800;margin-bottom:6px;">${safeLabel}</div>
          <div style="font-size:15px;line-height:1.55;color:#0f172a;font-weight:800;overflow-wrap:anywhere;word-break:break-word;white-space:normal;max-width:100%;">${safeValue}</div>
          ${link ? `<div style="margin-top:10px;"><a href="${link}" style="display:inline-block;color:#2563eb;text-decoration:none;font-weight:800;font-size:14px;overflow-wrap:anywhere;word-break:break-word;">${linkText}</a></div>` : ""}
        </div>`;
}

function orderEmailSubject(order = {}, type = "status") {
  if (type === "placed") return "Order received - Medicare At Home";
  if (type === "quote") return "Prescription price ready - Medicare At Home";
  return `Order status: ${statusLabel(order.status)} - Medicare At Home`;
}

function buildOrderEmailHtml(order = {}, type = "status", env = {}) {
  const orderUrl = siteUrl(env) ? `${siteUrl(env)}/profile/orders` : "";
  const isQuoteEmail = type === "quote";
  const title = type === "placed" ? "Order received" : (isQuoteEmail ? "Prescription price ready" : `Order ${statusLabel(order.status)}`);
  const intro = type === "placed"
    ? (order.orderType === "prescription" ? "We received your prescribed medicine request. Admin will review it and send the price soon." : "We received your store order.")
    : (isQuoteEmail ? "Admin reviewed your prescribed medicine request and added the medicine price and delivery charge. Open your Order Status page to choose Cash on Delivery or bKash/Nagad and submit payment details." : statusMessage(order.status));
  const total = orderTotal(order);
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const productName = cleanText(order.productName || "Product", 220);
  const customerName = cleanText(order.customerName || order.userName || "Customer", 160);
  const rawAddress = order.address || "Not provided";
  const rawDelivery = order.deliveryLocation || order.address || "Not provided";
  const addressUrl = firstUrl(rawAddress);
  const deliveryUrl = firstUrl(rawDelivery) || addressUrl;
  const address = stripUrls(rawAddress);
  const delivery = stripUrls(rawDelivery);
  const phone = cleanText(order.phone || "Not provided", 80);
  const status = statusLabel(order.status);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
  </head>
  <body style="margin:0;background:#f3f7ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;-webkit-text-size-adjust:100%;text-size-adjust:100%;">
    <div style="width:100%;background:#f3f7ff;padding:16px 0;">
      <div style="max-width:640px;margin:0 auto;padding:0 14px;box-sizing:border-box;">
        <div style="background:#ffffff;border-radius:24px;padding:24px 18px;border:1px solid #dbeafe;box-shadow:0 16px 40px rgba(15,23,42,.08);box-sizing:border-box;width:100%;overflow:hidden;">
          <div style="font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;margin-bottom:10px;overflow-wrap:anywhere;">Medicare At Home</div>
          <h1 style="font-size:26px;line-height:1.18;margin:0 0 12px;color:#0f172a;overflow-wrap:anywhere;word-break:break-word;">${safeTitle}</h1>
          <p style="font-size:16px;line-height:1.65;margin:0 0 20px;color:#475569;overflow-wrap:anywhere;word-break:break-word;">${safeIntro}</p>


          <div style="width:100%;box-sizing:border-box;">
            ${emailRow("Status", status)}
            ${emailRow("Product", productName)}
            ${emailRow("Quantity", cleanText(order.quantity || 1, 40))}
            ${order.prescriptionText ? emailRow("Prescription note", cleanText(order.prescriptionText, 500)) : ""}
            ${order.prescriptionFileUrl ? emailRow("Prescription file", "Attached by customer") : ""}
            ${emailRow(order.orderType === "prescription" ? "Total medicine price" : "Product price", money(order.productPrice || 0))}
            ${emailRow("Delivery charge", money(order.deliveryCharge || 0))}
            ${emailRow("Total", money(total))}
            ${emailRow("Customer", customerName)}
            ${emailRow("Phone", phone)}
            ${emailRow("Address", address, addressUrl ? { link: addressUrl, linkText: "Open Google Maps" } : {})}
            ${emailRow("Delivery location", delivery, deliveryUrl ? { link: deliveryUrl, linkText: "Open delivery map" } : {})}
          </div>

          ${orderUrl ? `<p style="margin:24px 0 6px;"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800;font-size:14px;line-height:1.2;">View order status</a></p>` : ""}
          <p style="font-size:13px;line-height:1.6;color:#64748b;margin:20px 0 0;overflow-wrap:anywhere;word-break:break-word;">This is an automated order email from Medicare At Home.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function buildOrderEmailText(order = {}, type = "status", env = {}) {
  const orderUrl = siteUrl(env) ? `${siteUrl(env)}/profile/orders` : "";
  const isQuoteEmail = type === "quote";
  const lines = [
    "Medicare At Home",
    type === "placed" ? "Order received" : (isQuoteEmail ? "Prescription price ready" : `Order status: ${statusLabel(order.status)}`),
    type === "placed"
      ? (order.orderType === "prescription" ? "We received your prescribed medicine request. Admin will review it and send the price soon." : "We received your store order.")
      : (isQuoteEmail ? "Admin reviewed your prescribed medicine request and added the medicine price and delivery charge. Open your Order Status page to choose Cash on Delivery or bKash/Nagad and submit payment details." : statusMessage(order.status)),
    "",
    `Status: ${statusLabel(order.status)}`,
    `Product: ${order.productName || "Product"}`,
    `Quantity: ${order.quantity || 1}`,
    ...(order.prescriptionText ? [`Prescription note: ${order.prescriptionText}`] : []),
    ...(order.prescriptionFileUrl ? ["Prescription file: Attached by customer"] : []),
    `${order.orderType === "prescription" ? "Total medicine" : "Product"} price: ${money(order.productPrice || 0)}`,
    `Delivery charge: ${money(order.deliveryCharge || 0)}`,
    `Total: ${money(orderTotal(order))}`,
    `Customer: ${order.customerName || order.userName || "Customer"}`,
    `Phone: ${order.phone || "Not provided"}`,
    `Address: ${order.address || "Not provided"}`,
    `Delivery location: ${order.deliveryLocation || order.address || "Not provided"}`
  ];
  if (orderUrl) lines.push("", `View order status: ${orderUrl}`);
  return lines.join("\n");
}

export async function sendBrevoEmail(env = {}, { toEmail, toName = "Customer", subject, htmlContent, textContent }) {
  const config = brevoConfig(env);
  const recipientEmail = cleanEmail(toEmail);
  if (config.disabled) return { ok: false, skipped: true, reason: "Brevo order emails are disabled" };
  if (!config.apiKey || !config.senderEmail) return { ok: false, skipped: true, reason: "Missing BREVO_API_KEY or BREVO_SENDER_EMAIL" };
  if (!recipientEmail) return { ok: false, skipped: true, reason: "Customer email is missing" };

  const payload = {
    sender: { name: config.senderName || "Medicare At Home", email: config.senderEmail },
    to: [{ email: recipientEmail, name: cleanText(toName, 120) || "Customer" }],
    subject: cleanText(subject, 180),
    htmlContent: String(htmlContent || ""),
    textContent: String(textContent || "")
  };
  if (config.replyToEmail) payload.replyTo = { email: config.replyToEmail, name: config.senderName || "Medicare At Home" };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": config.apiKey
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok) return { ok: false, skipped: false, reason: data?.message || `Brevo HTTP ${response.status}`, status: response.status };
    return { ok: true, messageId: data?.messageId || "" };
  } catch (error) {
    return { ok: false, skipped: false, reason: String(error?.message || error) };
  }
}

export async function notifyOrderPlacedEmail(env = {}, order = {}) {
  return sendBrevoEmail(env, {
    toEmail: order.userEmail,
    toName: order.customerName || order.userName || "Customer",
    subject: orderEmailSubject(order, "placed"),
    htmlContent: buildOrderEmailHtml(order, "placed", env),
    textContent: buildOrderEmailText(order, "placed", env)
  });
}

export async function notifyOrderStatusEmail(env = {}, order = {}) {
  return sendBrevoEmail(env, {
    toEmail: order.userEmail,
    toName: order.customerName || order.userName || "Customer",
    subject: orderEmailSubject(order, "status"),
    htmlContent: buildOrderEmailHtml(order, "status", env),
    textContent: buildOrderEmailText(order, "status", env)
  });
}


export async function notifyPrescriptionQuoteEmail(env = {}, order = {}) {
  return sendBrevoEmail(env, {
    toEmail: order.userEmail,
    toName: order.customerName || order.userName || "Customer",
    subject: orderEmailSubject(order, "quote"),
    htmlContent: buildOrderEmailHtml(order, "quote", env),
    textContent: buildOrderEmailText(order, "quote", env)
  });
}
