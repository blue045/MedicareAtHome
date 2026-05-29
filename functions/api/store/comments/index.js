import { error, handleThrown, json, readJson } from "../../../_lib/response.js";
import { rateLimitRequest } from "../../../_lib/security.js";
import { createComment, getStoreDb, getStoreUserFromRequest, listComments, listUserReviews, sanitizeCommentInput } from "../../../_lib/store-db.js";
import { notifyTelegram } from "../../../_lib/telegram.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = await getStoreDb(env);
    const params = new URL(request.url).searchParams;
    if (params.get("mine") === "1") {
      const user = await getStoreUserFromRequest(request, env, db);
      if (!user) return error("Please log in first.", 401);
      const reviews = await listUserReviews(db, user.id);
      return json({ reviews, comments: reviews });
    }
    const productId = params.get("productId") || "";
    const comments = await listComments(db, productId, false);
    return json({ comments }, { headers: productId ? { "cache-control": "public, max-age=30, stale-while-revalidate=120" } : {} });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const db = await getStoreDb(env);
    const limit = await rateLimitRequest(db, request, env, "store_review", { limit: 8, windowSeconds: 15 * 60 });
    if (!limit.ok) return error("Too many review attempts. Please wait and try again.", 429, undefined, { "retry-after": String(limit.retryAfter || 60) });
    const body = await readJson(request, env);
    const result = sanitizeCommentInput(body);
    if (!result.ok) return error(result.error, 400);

    const user = await getStoreUserFromRequest(request, env, db);
    if (!result.value.isReview) return error("Public replies are disabled.", 400);
    if (!user) return error("Please log in first.", 401);

    const comment = await createComment(db, user, result.value);
    await notifyTelegram(env, "New user review", {
      ProductID: comment.productId,
      Product: comment.productName || result.value.productId,
      User: user.fullName,
      Email: user.email || "Not provided",
      Phone: user.phone || "Not provided",
      Rating: comment.rating,
      Review: comment.comment
    });
    return json({ ok: true, comment }, { status: 201 });
  } catch (err) {
    return error(err?.message || "Could not submit review or reply.", 400);
  }
}
