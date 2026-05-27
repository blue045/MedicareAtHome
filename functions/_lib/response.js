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

export function error(message, status = 500, details = undefined) {
  return json({ error: message, ...(details ? { details } : {}) }, { status });
}

export async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
      status: 415,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  try {
    return await request.json();
  } catch {
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
