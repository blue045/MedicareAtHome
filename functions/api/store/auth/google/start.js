import { createGoogleState, googleOAuthConfig, googleRedirectUri, googleStateCookieHeader } from "../../../../_lib/google-auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const config = googleOAuthConfig(env);
    if (!config.clientId || !config.clientSecret) {
      return new Response("Google login is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.", { status: 500 });
    }

    const url = new URL(request.url);
    const next = url.searchParams.get("next") || "/profile";
    const state = await createGoogleState(next, env);
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", googleRedirectUri(request, env));
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");
    authUrl.searchParams.set("access_type", "online");
    authUrl.searchParams.set("include_granted_scopes", "true");

    return new Response(null, {
      status: 302,
      headers: {
        location: authUrl.toString(),
        "cache-control": "no-store",
        "set-cookie": googleStateCookieHeader(state, request)
      }
    });
  } catch (err) {
    return new Response(err?.message || "Could not start Google login.", { status: 500 });
  }
}
