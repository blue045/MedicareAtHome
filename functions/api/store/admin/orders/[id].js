import { requireAdmin } from "../../../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../../../_lib/response.js";
import { notifyOrderStatusEmail, notifyPrescriptionQuoteEmail } from "../../../../_lib/brevo.js";
import { deleteOrder, getOrderById, getStoreDb, sanitizePrescriptionQuoteInput, updateOrderStatus, updatePrescriptionOrderQuote } from "../../../../_lib/store-db.js";

function isQuoteUpdate(body = {}) {
  return body.action === "quote" || body.action === "set_prescription_price" || body.quoteProductPrice !== undefined || body.productPrice !== undefined || body.quoteDeliveryCharge !== undefined || body.deliveryCharge !== undefined;
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "orders");
    if (unauthorized) return unauthorized;
    const body = await readJson(request);
    const db = await getStoreDb(env);
    const before = await getOrderById(db, params.id);
    if (!before) return error("Order not found", 404);

    if (isQuoteUpdate(body)) {
      const quote = sanitizePrescriptionQuoteInput(body);
      if (!quote.ok) return error(quote.error, 400);
      const order = await updatePrescriptionOrderQuote(db, params.id, quote.value);
      if (!order) return error("Order not found", 404);
      const email = await notifyPrescriptionQuoteEmail(env, order);
      return json({ ok: true, order, email, quoteUpdated: true });
    }

    const order = await updateOrderStatus(db, params.id, body.status || "pending");
    if (!order) return error("Order not found", 404);
    const email = before.status === order.status
      ? { ok: false, skipped: true, reason: "Order status was unchanged" }
      : await notifyOrderStatusEmail(env, order);
    return json({ ok: true, order, email });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const unauthorized = await requireAdmin(request, env, "orders");
    if (unauthorized) return unauthorized;
    const db = await getStoreDb(env);
    const deleted = await deleteOrder(db, params.id);
    if (!deleted) return error("Order not found", 404);
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
}
