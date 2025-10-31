export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import CoachEntry from "@/models/coachEntryModel";

export async function GET(req, { params }) {
  await connectDB();

  const { slug } = await params;
  const viewer = await getCurrentUserFromCookies().catch(() => null);
  const gate = await requireTeamRole(viewer?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const url = new URL(req.url);
  const excludeEvent = url.searchParams.get("excludeEvent") || null;

  const team = await Team.findOne({ teamSlug: slug }).lean();
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Build already-added sets (string-normalized)
  let alreadyUsers = new Set();
  let alreadyFamilies = new Set();
  let alreadyNames = new Set(); // fallback if older docs missing familyMember
  if (excludeEvent) {
    const existing = await CoachEntry.find({
      event: excludeEvent,
      deletedAt: null,
    })
      .select("athlete.user athlete.familyMember athlete.name")
      .lean();

    alreadyUsers = new Set(
      existing.map((e) => String(e?.athlete?.user || "")).filter(Boolean)
    );
    alreadyFamilies = new Set(
      existing
        .map((e) => String(e?.athlete?.familyMember || ""))
        .filter(Boolean)
    );
    alreadyNames = new Set(
      existing
        .map((e) =>
          String(e?.athlete?.name || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    );
  }

  const memberships = await TeamMember.find({
    teamId: team._id,
    status: { $nin: ["pending", "invited", "blocked", "declined"] },
  })
    .select("role userId familyMemberId")
    .lean();

  const includeRoles = new Set([
    "member",
    "athlete",
    "coach",
    "manager",
    "owner",
  ]);
  const rows = [];

  for (const m of memberships) {
    const role = (m.role || "").toLowerCase();
    if (!includeRoles.has(role)) continue;

    if (m.familyMemberId) {
      const fm = await FamilyMember.findById(m.familyMemberId).lean();
      if (!fm) continue;

      const famId = String(fm._id);
      const nameKey =
        `${(fm.firstName || "").trim()} ${(fm.lastName || "").trim()}`
          .trim()
          .toLowerCase() || (fm.username || "").toLowerCase();

      if (excludeEvent) {
        if (alreadyFamilies.has(famId)) continue;
        // fallback by name if older entries missing familyMember
        if (nameKey && alreadyNames.has(nameKey)) continue;
      }

      rows.push({
        id: String(m._id),
        role,
        isOwner: false,
        isFamilyMember: true,
        familyMemberId: famId,
        userId: null,
        name:
          `${fm.firstName || ""} ${fm.lastName || ""}`.trim() ||
          fm.username ||
          "Family Member",
        username: fm.username || null,
        avatarUrl: fm.avatar || null,
      });
      continue;
    }

    if (m.userId) {
      const u = await User.findById(m.userId).lean();
      if (!u) continue;

      const uId = String(u._id);
      const nameKey =
        `${(u.firstName || "").trim()} ${(u.lastName || "").trim()}`
          .trim()
          .toLowerCase() || (u.username || u.email || "").toLowerCase();

      if (excludeEvent) {
        if (alreadyUsers.has(uId)) continue;
        if (nameKey && alreadyNames.has(nameKey)) continue;
      }

      rows.push({
        id: String(m._id),
        role,
        isOwner: false,
        isFamilyMember: false,
        familyMemberId: null,
        userId: uId,
        name:
          `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
          u.username ||
          u.email ||
          "Member",
        username: u.username || null,
        avatarUrl:
          u.avatarType === "google"
            ? u.googleAvatar || u.avatar || null
            : u.avatarType === "facebook"
            ? u.facebookAvatar || u.avatar || null
            : u.avatar || null,
      });
    }
  }

  // Ensure owner row present unless excluded
  const ownerId = String(team.user);
  const ownerPresent = rows.some((r) => r.userId === ownerId);
  const ownerExcluded =
    excludeEvent && (alreadyUsers.has(ownerId) || alreadyNames.has(ownerId));
  if (!ownerPresent && !ownerExcluded) {
    const owner = await User.findById(ownerId).lean();
    if (owner) {
      rows.unshift({
        id: `owner-${team._id}`,
        role: "manager",
        isOwner: true,
        isFamilyMember: false,
        familyMemberId: null,
        userId: ownerId,
        name:
          `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
          owner.username ||
          owner.email ||
          "Team Owner",
        username: owner.username || null,
        avatarUrl:
          owner.avatarType === "google"
            ? owner.googleAvatar || owner.avatar || null
            : owner.avatarType === "facebook"
            ? owner.facebookAvatar || owner.avatar || null
            : owner.avatar || null,
      });
    }
  }

  rows.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      sensitivity: "base",
    })
  );

  return NextResponse.json({ members: rows }, { status: 200 });
}
