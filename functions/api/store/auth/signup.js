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
    if (message.includes("store_auth_secret") || message.includes("admin_session_secret")) {
      return error("Signup is not configured yet. Add STORE_AUTH_SECRET or ADMIN_SESSION_SECRET in Cloudflare Pages environment variables, then redeploy.", 500);
    }
    if (message.includes("missing turso") || message.includes("invalid store turso") || message.includes("invalid turso")) {
      return error("Signup database is not configured yet. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, or the STORE_TURSO_DATABASE_URL and STORE_TURSO_AUTH_TOKEN pair, in Cloudflare Pages environment variables.", 500);
    }
    if (message.includes("sqlite_busy") || message.includes("database is locked") || message.includes("server is busy") || message.includes("temporarily unavailable") || message.includes("timeout")) {
      return error("Signup database is busy. Please wait a few seconds and try again.", 503);
    }
    console.error("Signup failed:", err);
    return error(err?.message || "Could not create account right now.", 500);
  }
}
