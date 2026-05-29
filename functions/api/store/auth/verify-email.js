import { getStoreDb, verifyUserEmailToken } from "../../../_lib/store-db.js";

function htmlPage(title, message, ok = true) {
  const color = ok ? "#2563eb" : "#dc2626";
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f3f7ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;"><main style="min-height:100vh;display:grid;place-items:center;padding:24px;"><section style="max-width:560px;background:#fff;border:1px solid #dbeafe;border-radius:24px;padding:28px;box-shadow:0 18px 50px rgba(15,23,42,.08);"><p style="font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${color};">Medicare At Home</p><h1 style="margin:0 0 12px;font-size:28px;">${title}</h1><p style="font-size:16px;line-height:1.6;color:#475569;">${message}</p><p><a href="/login" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:800;">Go to login</a></p></section></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function onRequestGet({ request, env }) {
  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    const db = await getStoreDb(env);
    const result = await verifyUserEmailToken(db, token, env);
    if (!result.ok) return htmlPage("Verification failed", result.error || "Could not verify your email.", false);
    return htmlPage("Email verified", "Your email is verified. You can now log in and use your account.", true);
  } catch (err) {
    return htmlPage("Verification failed", String(err?.message || "Server error"), false);
  }
}
