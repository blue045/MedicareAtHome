import { sendEmailVerificationEmail } from "../../../_lib/brevo.js";
import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { rateLimitRequest } from "../../../_lib/security.js";
import { avatarPhotoExists, createStoreToken, createUser, createUserEmailVerificationToken, getStoreDb, getUserByEmail, getUserByPhone, isEmailVerificationRequired, sanitizeUserInput } from "../../../_lib/store-db.js";
import { notifyTelegram } from "../../../_lib/telegram.js";

function rateLimitError(result) {
  return error("Too many attempts. Please wait and try again.", 429, undefined, { "retry-after": String(result.retryAfter || 60) });
}

export async function onRequestPost({ request, env }) {
  try {
    const db = await getStoreDb(env);
    const limit = await rateLimitRequest(db, request, env, "store_signup", { limit: 5, windowSeconds: 15 * 60 });
    if (!limit.ok) return rateLimitError(limit);

    const body = await readJson(request, env);
    const result = sanitizeUserInput(body);
    if (!result.ok) return error(result.error, 400);

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
      UserID: user.id,
      EmailVerified: user.emailVerified ? "Yes" : "Pending"
    });

    if (isEmailVerificationRequired(env) && user.email && !user.emailVerified) {
      const verificationToken = await createUserEmailVerificationToken(db, user.id, env);
      const verificationEmail = await sendEmailVerificationEmail(env, user, verificationToken);
      return json({ ok: true, needsVerification: true, user, verificationEmail, message: "Account created. Please verify your email before logging in." }, { status: 201 });
    }

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
