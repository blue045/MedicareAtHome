import { getDb } from "../../_lib/db.js";
import { isAdmin, requireAdmin } from "../../_lib/auth.js";
import { error, handleThrown, json, readJson } from "../../_lib/response.js";
import { normalizeBloodProfile, toPublicBloodProfile } from "../../_lib/validators.js";
import { createBloodProfile, listBloodProfiles } from "../../_lib/turso.js";
import { notifyTelegram } from "../../_lib/telegram.js";

function statusFromRequest(request, admin) {
  if (!admin) return "approved";
  const status = new URL(request.url).searchParams.get("status") || "approved";
  return ["approved", "pending", "all"].includes(status) ? status : "approved";
}

export async function onRequestGet({ env, request }) {
  try {
    const admin = await isAdmin(request, env, "blood");
    const status = statusFromRequest(request, admin);
    const db = await getDb(env);
    const profiles = await listBloodProfiles(db, status);
    return json({ profiles: profiles.map((profile) => toPublicBloodProfile(profile, { admin })) });
  } catch (err) {
    return handleThrown(err);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await readJson(request);
    const admin = await isAdmin(request, env, "blood");
    const result = normalizeBloodProfile({ ...body, isApproved: admin ? body.isApproved === true : false });
    if (!result.ok) return error(result.error, 400);

    const db = await getDb(env);
    const profile = await createBloodProfile(db, result.value);
    await notifyTelegram(env, "New blood section entry", {
      Name: profile.fullName,
      BloodGroup: profile.bloodGroup,
      Gender: profile.gender,
      Phone: profile.phone,
      WhatsApp: profile.whatsapp,
      Address: profile.homeAddress,
      Status: admin ? "Added by admin" : "Pending admin approval"
    });
    return json({ ok: true, profile: toPublicBloodProfile(profile, { admin }) }, { status: 201 });
  } catch (err) {
    return handleThrown(err);
  }
}
