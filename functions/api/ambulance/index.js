import { error, handleThrown, json, readJson } from "../../_lib/response.js";
import { notifyTelegram } from "../../_lib/telegram.js";

function cleanText(value, max = 500) {
  return String(value || "")
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, max);
}

function cleanPhone(value) {
  return String(value || "")
    .replace(/[^0-9+\-\s]/g, "")
    .trim()
    .slice(0, 32);
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await readJson(request);
    const fullName = cleanText(body.fullName || body.name, 140);
    const phone = cleanPhone(body.phone);
    const pickup = cleanText(body.pickup || body.pickupLocation, 300);
    const destination = cleanText(body.destination, 300);
    const patientCondition = cleanText(body.patientCondition || body.condition, 700);

    if (!fullName || !phone || !pickup) {
      return error("Name, phone number and pickup location are required.", 400);
    }

    await notifyTelegram(env, "New ambulance request", {
      Name: fullName,
      Phone: phone,
      Pickup: pickup,
      Destination: destination || "Not provided",
      Condition: patientCondition || "Not provided"
    });

    return json({ ok: true, message: "Ambulance request sent." }, { status: 201 });
  } catch (err) {
    return handleThrown(err);
  }
}
