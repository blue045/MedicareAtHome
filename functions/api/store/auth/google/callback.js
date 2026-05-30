import { createStoreToken, createOrLinkGoogleUser, getStoreDb } from "../../../../_lib/store-db.js";
import { authErrorHtml, authResultHtml, clearGoogleStateCookieHeader, exchangeGoogleCodeForToken, fetchGoogleProfile, readGoogleStateCookie, verifyGoogleState } from "../../../../_lib/google-auth.js";
import { notifyTelegram } from "../../../../_lib/telegram.js";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const stateParam = url.searchParams.get("state") || "";
    const state = await verifyGoogleState(stateParam, env);
    const next = state.next || "/profile";
    const cookieState = readGoogleStateCookie(request);

    if (!state.ok || cookieState !== stateParam) return authErrorHtml("Google login session expired. Please try again.", next);
    if (url.searchParams.get("error")) return authErrorHtml(url.searchParams.get("error_description") || url.searchParams.get("error") || "Google login was cancelled.", next);

    const code = url.searchParams.get("code") || "";
    if (!code) return authErrorHtml("Google did not return a login code. Please try again.", next);

    const tokenData = await exchangeGoogleCodeForToken(code, request, env);
    const profile = await fetchGoogleProfile(tokenData.access_token);
    const db = await getStoreDb(env, { mode: "auth" });
    const { user, isNewUser, linkedExisting } = await createOrLinkGoogleUser(db, profile, env);
    const token = await createStoreToken(user, env);

    await notifyTelegram(env, isNewUser ? "New Google user sign-up" : "Google user login", {
      Name: user.fullName,
      Email: user.email || "Not provided",
      Phone: user.phone || "Not provided",
      UserID: user.id,
      LinkedExisting: linkedExisting ? "Yes" : "No"
    });

    const response = authResultHtml({ token, user, next });
    response.headers.append("set-cookie", clearGoogleStateCookieHeader(request));
    return response;
  } catch (err) {
    console.error(err);
    return authErrorHtml(err?.message || "Could not finish Google login.", "/login");
  }
}
