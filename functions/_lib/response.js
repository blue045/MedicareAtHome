export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

export function error(message, status = 500, details = undefined, headers = {}) {
  return json({ error: message, ...(details ? { details } : {}) }, { status, headers });
}

function maxJsonBytes(env = {}) {
  const value = Number(env.MAX_JSON_BODY_BYTES || "2200000");
  if (!Number.isFinite(value)) return 2200000;
  return Math.max(100000, Math.min(5000000, Math.round(value)));
}

export async function readJson(request, env = {}) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
      status: 415,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  const maxBytes = maxJsonBytes(env);
  if (contentLength && contentLength > maxBytes) {
    throw new Response(JSON.stringify({ error: `Request body is too large. Maximum allowed size is ${Math.round(maxBytes / 1024)} KB.` }), {
      status: 413,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > maxBytes) {
      throw new Response(JSON.stringify({ error: `Request body is too large. Maximum allowed size is ${Math.round(maxBytes / 1024)} KB.` }), {
        status: 413,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }
    return JSON.parse(text || "{}");
  } catch (err) {
    if (err instanceof Response) throw err;
    throw new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
}

export function handleThrown(value) {
  if (value instanceof Response) return value;
  console.error(value);
  return error("Server error", 500);
}
