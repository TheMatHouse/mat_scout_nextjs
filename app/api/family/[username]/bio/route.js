export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import FamilyMember from "@/models/familyMemberModel";
import Follow from "@/models/followModel";
import { blocksToText } from "@/lib/editor/blocksToText";
import { notifyFamilyFollowers } from "@/lib/notify-family-followers";

const json = (data, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function htmlToText(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// GET → return existing bio
export async function GET(_req, { params }) {
  await connectDB();
  const { username } = await params;

  const fam = await FamilyMember.findOne(
    { username },
    { _id: 1, userId: 1, bioHtml: 1, bioText: 1 }
  ).lean();

  if (!fam) return json({ error: "Family member not found" }, 404);

  return json({
    bioHtml: fam.bioHtml || "",
    bioText: fam.bioText || "",
  });
}

// POST/PUT → save and notify followers
export async function POST(req, ctx) {
  return putOrPost(req, ctx);
}
export async function PUT(req, ctx) {
  return putOrPost(req, ctx);
}

async function putOrPost(req, { params }) {
  await connectDB();
  const { username } = await params;

  const viewer = await getCurrentUser();
  if (!viewer) return json({ error: "Unauthorized" }, 401);

  const fam = await FamilyMember.findOne(
    { username },
    { _id: 1, username: 1, userId: 1 }
  ).lean();
  if (!fam) return json({ error: "Family member not found" }, 404);
  if (String(fam.userId) !== String(viewer._id))
    return json({ error: "Forbidden" }, 403);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  let bioHtml = body?.bioHtml ?? null;
  let bioText = "";

  if (typeof bioHtml === "string") {
    bioText = htmlToText(bioHtml);
  } else if (body?.bio) {
    bioText = blocksToText(body.bio);
    bioHtml = "";
  }

  if (bioText.length > 2000)
    return json({ error: "Bio exceeds 2000 characters" }, 400);

  await FamilyMember.updateOne(
    { _id: fam._id },
    { $set: { bioHtml: bioHtml || "", bioText } }
  );

  // ---------------- DEBUG: what follows exist? ----------------
  try {
    const shapes = [
      {
        label: "new.followingFamilyId",
        q: { targetType: "family", followingFamilyId: fam._id },
      },
      { label: "noTT.followingFamilyId", q: { followingFamilyId: fam._id } },
      {
        label: "legacy.followingId",
        q: { targetType: "family", followingId: fam._id },
      },
      { label: "noTT.followingId", q: { followingId: fam._id } },
      {
        label: "legacy.username.tt",
        q: { targetType: "family", followingFamilyUsername: fam.username },
      },
      { label: "noTT.username", q: { followingFamilyUsername: fam.username } },
      { label: "targetId", q: { targetType: "family", targetId: fam._id } },
      {
        label: "targetUsername",
        q: { targetType: "family", targetUsername: fam.username },
      },
      { label: "entityId", q: { entityId: fam._id } },
    ];
    for (const s of shapes) {
      const c = await Follow.countDocuments(s.q);
      console.log(`[family bio DEBUG] follow shape "${s.label}" count = ${c}`);
    }
  } catch (e) {
    console.log("[family bio DEBUG] follow shape count failed:", e?.message);
  }
  // ------------------------------------------------------------

  console.log(
    "[family bio] saved -> notifying followers for",
    fam.username,
    "by viewer",
    viewer.username
  );

  // 🔧 IMPORTANT: pass a STRING identifier (username) so resolver never chokes
  await notifyFamilyFollowers({
    familyId: fam.username, // ← pass username (string)
    type: "family_profile_updated",
    actorUserId: viewer._id,
    payload: { preview: bioText.slice(0, 140) },
  });

  return json({ ok: true, bioHtml: bioHtml || "", bioText });
}
