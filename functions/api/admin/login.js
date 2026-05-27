import { handleLogin } from "../../_lib/auth.js";
import { handleThrown } from "../../_lib/response.js";

export async function onRequestPost({ request, env }) {
  try {
    return await handleLogin(request, env);
  } catch (err) {
    return handleThrown(err);
  }
}
