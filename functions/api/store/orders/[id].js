import { notifyOrderStatusEmail } from "../../../_lib/brevo.js";
import { notifyTelegram } from "../../../_lib/telegram.js";
import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { cancelPendingOrderForUser, getStoreDb, getStoreUserFromRequest, sanitizeOrderPaymentInput, submitPrescriptionOrderPayment } from "../../../_lib/store-db.js";


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

export async function onRequestPatch({ request, env, params }) {
  try {
    const db = await getStoreDb(env);
    const user = await getStoreUserFromRequest(request, env, db);
    if (!user) return error("Please log in first.", 401);
    const body = await readJson(request);
    const action = body.action || "cancel";

    if (["submit_payment", "payment", "submit_prescription_payment"].includes(action)) {
      const payment = sanitizeOrderPaymentInput(body);
      if (!payment.ok) return error(payment.error, 400);
      const order = await submitPrescriptionOrderPayment(db, user.id, params.id, payment.value);
      if (!order) return error("Order not found", 404);
      const telegram = await notifyPaymentTelegram(env, order);
      const email = await notifyOrderStatusEmail(env, order);
      return json({ ok: true, order, email, telegram, paymentSubmitted: true });
    }

    if (action !== "cancel") return error("Unsupported order action.", 400);
    const order = await cancelPendingOrderForUser(db, user.id, params.id);
    if (!order) return error("Order not found", 404);
    return json({ ok: true, order });
  } catch (err) {
    return error(err?.message || "Could not update order.", 400);
  }
}

export async function onRequestDelete(context) {
  return onRequestPatch(context);
}
