function cleanEnv(value) {
  return String(value || "").trim().replace(/^[\'\"]|[\'\"]$/g, "");
}

function base64UrlEncode(text) {
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(text) {
  const normalized = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

async function sha256(text) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stateSecret(env = {}) {
  return cleanEnv(env.GOOGLE_OAUTH_STATE_SECRET || env.STORE_AUTH_SECRET || env.ADMIN_TOKEN || env.ADMIN_PASSWORD || "medicare-google-oauth-state");
}

export function googleOAuthConfig(env = {}) {
  return {
    clientId: cleanEnv(env.GOOGLE_CLIENT_ID || env.STORE_GOOGLE_CLIENT_ID),
    clientSecret: cleanEnv(env.GOOGLE_CLIENT_SECRET || env.STORE_GOOGLE_CLIENT_SECRET)
  };
}

export function validateGoogleOAuthConfig(env = {}) {
  const config = googleOAuthConfig(env);
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Google login is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Cloudflare Pages environment variables.");
  }
  return config;
}

function siteOrigin(request, env = {}) {
  const configured = cleanEnv(env.SITE_URL || env.PUBLIC_SITE_URL || env.APP_URL || env.BASE_URL);
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall back to the current request origin if SITE_URL is malformed.
    }
  }
  return new URL(request.url).origin;
}

export function googleRedirectUri(request, env = {}) {
  return `${siteOrigin(request, env)}/api/store/auth/google/callback`;
}

function safeNext(value = "") {
  const next = String(value || "").trim();
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/api/")) return next.slice(0, 500);
  return "/profile";
}

export async function createGoogleState(next = "/profile", env = {}) {
  const payload = {
    next: safeNext(next),
    ts: Date.now(),
    nonce: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = await sha256(`${encoded}.${stateSecret(env)}`);
  return `${encoded}.${sig}`;
}

export async function verifyGoogleState(state = "", env = {}) {
  const [encoded, sig] = String(state || "").split(".");
  if (!encoded || !sig) return { ok: false, next: "/login" };
  const expected = await sha256(`${encoded}.${stateSecret(env)}`);
  if (sig !== expected) return { ok: false, next: "/login" };
  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    const ageMs = Date.now() - Number(payload.ts || 0);
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 10 * 60 * 1000) return { ok: false, next: "/login" };
    return { ok: true, next: safeNext(payload.next || "/profile"), nonce: String(payload.nonce || "") };
  } catch {
    return { ok: false, next: "/login" };
  }
}

function cookieSecureFlag(request) {
  return new URL(request.url).protocol === "https:" ? "; Secure" : "";
}

export function googleStateCookieHeader(state, request) {
  return `medicare_google_oauth_state=${encodeURIComponent(state)}; Path=/api/store/auth/google; Max-Age=600; HttpOnly; SameSite=Lax${cookieSecureFlag(request)}`;
}

export function clearGoogleStateCookieHeader(request) {
  return `medicare_google_oauth_state=; Path=/api/store/auth/google; Max-Age=0; HttpOnly; SameSite=Lax${cookieSecureFlag(request)}`;
}

export function readGoogleStateCookie(request) {
  const cookie = request.headers.get("cookie") || "";
  const found = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("medicare_google_oauth_state="));
  if (!found) return "";
  try {
    return decodeURIComponent(found.split("=").slice(1).join("="));
  } catch {
    return found.split("=").slice(1).join("=");
  }
}

export async function exchangeGoogleCodeForToken(code, request, env = {}) {
  const config = validateGoogleOAuthConfig(env);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: googleRedirectUri(request, env),
      grant_type: "authorization_code"
    }).toString()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Could not finish Google login.");
  }
  return data;
}

export async function fetchGoogleProfile(accessToken) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.sub) {
    throw new Error(data.error_description || data.error || "Could not read Google profile.");
  }
  return data;
}

export function authResultHtml({ token, user, next = "/profile" }) {
  const payload = JSON.stringify({ token, user, next: safeNext(next) }).replace(/</g, "\\u003c");
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Signing in with Google...</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#edf4f2;color:#13211d}.card{width:min(420px,calc(100% - 32px));padding:28px;border-radius:26px;background:#fff;box-shadow:0 24px 70px rgba(11,21,18,.12);text-align:center}.spinner{width:36px;height:36px;border-radius:50%;border:4px solid rgba(59,99,255,.16);border-top-color:#3b63ff;margin:0 auto 16px;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <main class="card">
    <div class="spinner" aria-hidden="true"></div>
    <h1>Signing you in...</h1>
    <p>Please continue to the store account page.</p>
  </main>
  <script>
    (function(){
      var data = ${payload};
      try {
        localStorage.setItem("medicare_store_token", data.token || "");
        localStorage.setItem("medicare_store_cache_v2:currentUser", JSON.stringify({ timestamp: Date.now(), data: { user: data.user || null } }));
      } catch (error) {}
      window.location.replace(data.next || "/profile");
    })();
  </script>
</body>
</html>`, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export function authErrorHtml(message = "Google login failed.", next = "/login") {
  const target = safeNext(next === "/profile" ? "/login" : next);
  const safeMessage = String(message || "Google login failed.").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char]));
  const href = `/login?next=${encodeURIComponent(target)}`;
  return new Response(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Google login failed</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#edf4f2;color:#13211d}.card{width:min(440px,calc(100% - 32px));padding:28px;border-radius:26px;background:#fff;box-shadow:0 24px 70px rgba(11,21,18,.12);text-align:center}a{display:inline-flex;margin-top:14px;padding:11px 17px;border-radius:999px;background:#050816;color:#fff;text-decoration:none;font-weight:900}</style></head>
<body><main class="card"><h1>Google login failed</h1><p>${safeMessage}</p><a href="${href}">Back to login</a></main></body>
</html>`, {
    status: 400,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}
