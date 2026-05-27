function cleanEnv(value) {
  return String(value || "").trim().replace(/^[\'\"]|[\'\"]$/g, "");
}

function cleanLine(value, max = 900) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function telegramConfig(env = {}) {
  const token = cleanEnv(env.TELEGRAM_BOT_TOKEN || env.TG_BOT_TOKEN);
  const chatId = cleanEnv(env.TELEGRAM_ADMIN_CHAT_ID || env.TELEGRAM_CHAT_ID || env.TG_CHAT_ID);
  return { token, chatId };
}

export function hasTelegramConfig(env = {}) {
  const { token, chatId } = telegramConfig(env);
  return Boolean(token && chatId);
}

export async function notifyTelegram(env = {}, title = "Medicare At Home", fields = {}) {
  const { token, chatId } = telegramConfig(env);
  if (!token || !chatId) return { ok: false, skipped: true, reason: "Missing Telegram config" };

  const lines = [`🔔 ${cleanLine(title, 120)}`];
  Object.entries(fields || {}).forEach(([key, value]) => {
    const text = cleanLine(value);
    if (text) lines.push(`${cleanLine(key, 80)}: ${text}`);
  });

  const text = lines.join("\n").slice(0, 3900);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
    });
    if (!response.ok) return { ok: false, skipped: false, reason: `Telegram HTTP ${response.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, skipped: false, reason: String(error?.message || error) };
  }
}
