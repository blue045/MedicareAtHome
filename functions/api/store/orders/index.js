import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { notifyOrderPlacedEmail } from "../../../_lib/brevo.js";
import { createOrder, createPrescriptionOrder, getStoreDb, getStoreUserFromRequest, listOrders, sanitizeCheckoutInput, sanitizePrescriptionOrderInput } from "../../../_lib/store-db.js";
import { notifyTelegram } from "../../../_lib/telegram.js";


function money(value = 0) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function paymentMethodLabel(method = "") {
  if (method === "cod") return "Cash on Delivery";
  if (method === "bkash") return "bKash";
  if (method === "nagad") return "Nagad";
  if (method === "bkash_nagad") return "bKash/Nagad";
  return method || "Not provided";
}

function orderPaymentAmount(order = {}) {
  const productAmount = order.orderType === "prescription"
    ? Number(order.productPrice || 0)
    : Number(order.productPrice || 0) * Number(order.quantity || 1);
  if (order.paymentMethod === "cod") return Number(order.deliveryCharge || 0);
  return productAmount + Number(order.deliveryCharge || 0);
}

async function notifyPaymentTelegram(env, order = {}) {
  if (!order?.transactionId && !order?.senderNumber) return { ok: false, skipped: true, reason: "No payment details" };
  return notifyTelegram(env, "Payment submitted", {
    Customer: order.customerName || order.userName || "Customer",
    Product: order.productName || "Product",
    Quantity: order.quantity || 1,
    PaymentMethod: paymentMethodLabel(order.paymentMethod),
    DeliveryPayment: order.paymentMethod === "cod" ? paymentMethodLabel(order.deliveryPaymentMethod) : "Not applicable",
    AmountPaid: money(orderPaymentAmount(order)),
    TransactionID: order.transactionId || "Not provided",
    SenderNumber: order.senderNumber || "Not provided",
    Phone: order.phone || order.userPhone || "Not provided"
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const db = await getStoreDb(env);
    const user = await getStoreUserFromRequest(request, env, db);
    if (!user) return error("Please log in first.", 401);
    const orders = await listOrders(db, user.id);
    return json({ orders });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const db = await getStoreDb(env);
    const user = await getStoreUserFromRequest(request, env, db);
    if (!user) return error("Please log in first.", 401);
    const body = await readJson(request);
    const isPrescription = ["prescription", "prescribed", "prescribed_medicine", "custom"].includes(String(body.orderType || body.type || "").toLowerCase().replace(/[\s-]+/g, "_"));
    const result = isPrescription ? sanitizePrescriptionOrderInput(body) : sanitizeCheckoutInput(body);
    if (!result.ok) return error(result.error, 400);
    const order = isPrescription ? await createPrescriptionOrder(db, user.id, result.value) : await createOrder(db, user.id, result.value);
    await notifyTelegram(env, isPrescription ? "New prescribed medicine order" : "New order details", {
      Product: order.productName,
      Quantity: order.quantity,
      Customer: order.customerName,
      Phone: order.phone,
      Address: order.address,
      Delivery: order.deliveryLocation,
      Payment: isPrescription ? "Custom quote / admin review" : order.paymentMethod,
      TransactionID: order.transactionId || "Not provided",
      SenderNumber: order.senderNumber || "Not provided"
    });
    const paymentTelegram = await notifyPaymentTelegram(env, order);
    const email = await notifyOrderPlacedEmail(env, order);
    return json({ ok: true, order, email, paymentTelegram }, { status: 201 });
  } catch (err) {
    return error(err?.message || "Could not place order.", 400);
  }
}
