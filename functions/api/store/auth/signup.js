import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { avatarPhotoExists, createStoreToken, createUser, getStoreDb, getUserByEmail, getUserByPhone, sanitizeUserInput } from "../../../_lib/store-db.js";
import { notifyTelegram } from "../../../_lib/telegram.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await readJson(request);
    const result = sanitizeUserInput(body);
    if (!result.ok) return error(result.error, 400);

    const db = await getStoreDb(env);
    if (result.value.email) {
      const existingEmail = await getUserByEmail(db, result.value.email);
      if (existingEmail) return error("This email is already registered. Please log in.", 409);
    }
    if (result.value.phone) {
      const existingPhone = await getUserByPhone(db, result.value.phone);
      if (existingPhone) return error("This phone number is already registered. Please log in.", 409);
    }

    if (result.value.photoUrl && !(await avatarPhotoExists(db, result.value.photoUrl))) {
      return error("Choose an available default profile photo, or leave profile photo blank.", 400);
    }

    const user = await createUser(db, { ...result.value, createdAt: new Date(), updatedAt: new Date() }, env);
    await notifyTelegram(env, "New user sign-up", {
      Name: user.fullName,
      Email: user.email || "Not provided",
      Phone: user.phone || "Not provided",
      UserID: user.id
    });
    const token = await createStoreToken(user, env);
    return json({ ok: true, token, user }, { status: 201 });
  } catch (err) {
    const message = String(err?.message || err).toLowerCase();
    if (message.includes("unique") && message.includes("phone")) {
      return error("This phone number is already registered. Please log in.", 409);
    }
    if (message.includes("unique")) {
      return error("This email or phone number is already registered. Please log in.", 409);
    }
    return handleThrown(err);
  }
}
