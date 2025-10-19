export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import { notifyFollowers } from "@/lib/notify-followers";

const json = (data, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

// case-insensitive username match (same pattern you use elsewhere)
function escapeRegex(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const byUsername = (username) => ({
  username: { $regex: `^${escapeRegex(String(username))}$`, $options: "i" },
});

// Keep formatting; remove scripts/styles/inline handlers
function sanitizeKeepFormatting(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function htmlToText(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------------- GET ---------------- */
export async function GET(_req, { params }) {
  await connectDB();
  const { username } = await params;

  const doc = await User.findOne(byUsername(username), {
    _id: 1,
    bio: 1,
    bioText: 1,
  }).lean();

  if (!doc) return json({ error: "User not found" }, 404);

  return json({
    bioHtml: typeof doc.bio === "string" ? doc.bio : "",
    bioText: doc.bioText || "",
  });
}

/* --------------- POST/PUT --------------- */
export async function POST(req, ctx) {
  return saveBio(req, ctx);
}
export async function PUT(req, ctx) {
  return saveBio(req, ctx);
}

async function saveBio(req, { params }) {
  await connectDB();
  const { username } = await params;

  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer) return json({ error: "Unauthorized" }, 401);

  const target = await User.findOne(byUsername(username), {
    _id: 1,
    username: 1,
    firstName: 1,
    lastName: 1,
  }).lean();
  if (!target) return json({ error: "User not found" }, 404);

  const isOwner =
    String(viewer.username).toLowerCase() === String(username).toLowerCase();
  const isAdmin = !!viewer.isAdmin;
  if (!(isOwner || isAdmin)) return json({ error: "Forbidden" }, 403);

  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const incomingHtml = typeof body?.bioHtml === "string" ? body.bioHtml : "";
  // Normalize NBSPs (optional) then keep formatting while stripping scripts/styles/handlers
  const normalized = incomingHtml
    .replaceAll("&nbsp;", " ")
    .replace(/\u00a0/g, " ");
  const cleanHtml = sanitizeKeepFormatting(normalized);
  const bioText = htmlToText(cleanHtml);

  if (bioText.length > 1000) {
    return json({ error: "Bio exceeds 1000 characters" }, 400);
  }

  await User.updateOne(
    { _id: target._id },
    { $set: { bio: cleanHtml, bioText } }
  );

  // 🔔 notify followers (best-effort)
  try {
    await notifyFollowers(target._id, "followed.profile.updated", {
      changedFields: [{ key: "bio", oldValue: undefined, newValue: "updated" }],
    });
  } catch (e) {
    console.warn("[notifyFollowers] user-bio fanout failed:", e?.message);
  }

  return json({ ok: true, bioHtml: cleanHtml, bioText });
}
