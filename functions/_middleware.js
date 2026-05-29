export async function onRequest(context) {
  const response = await context.next();
  const headers = new Headers(response.headers);
  const pathname = new URL(context.request.url).pathname;
  const isHttps = new URL(context.request.url).protocol === "https:";

  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(self)");
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  headers.set("cross-origin-resource-policy", "same-site");

  // Inline theme snippets still exist in the static HTML, so unsafe-inline remains for scripts/styles.
  // frame-ancestors and object-src still block the most common clickjacking/plugin attacks.
  headers.set(
    "content-security-policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
      "connect-src 'self' https://api.brevo.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://api.telegram.org https://*.turso.io https://*.libsql.io",
      "frame-src 'self' https://accounts.google.com"
    ].join("; ")
  );
  if (isHttps) headers.set("strict-transport-security", "max-age=15552000; includeSubDomains; preload");

  if (pathname.startsWith("/assets/js/") || pathname.startsWith("/assets/css/")) {
    // Keep code assets fresh enough for frequent free-plan deployments.
    // The HTML still uses ?v= cache busting, but this prevents old JS/CSS from
    // sticking forever when a browser or proxy ignores the query string.
    headers.set("cache-control", "public, max-age=300, must-revalidate");
  } else if (pathname.startsWith("/assets/") || pathname === "/manifest.json" || pathname === "/robots.txt") {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
