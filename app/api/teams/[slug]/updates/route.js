// app/api/teams/[slug]/updates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamUpdate from "@/models/teamUpdateModel";
import Notification from "@/models/notification";
import User from "@/models/userModel";
import { getCurrentUser } from "@/lib/auth-server";
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const { isValidObjectId, Types } = mongoose;

function fullNameOrUsername(u) {
  if (!u) return "—";
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return name || u.username || "—";
}

function toObjectIdSafe(id) {
  const s = String(id || "");
  return isValidObjectId(s) ? new Types.ObjectId(s) : null;
}

/* =========================
   GET  /api/teams/:slug/updates
   ========================= */
export async function GET(_req, { params }) {
  try {
    await connectDB();
    const { slug } = await params;

    const team = await Team.findOne({ teamSlug: slug })
      .select("_id teamName teamSlug")
      .lean();
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // 1) Load updates and populate createdBy (preferred)
    const raw = await TeamUpdate.find({ teamId: team._id })
      .sort({ createdAt: -1 })
      .populate({ path: "createdBy", select: "firstName lastName username" })
      .lean();

    // 2) Collect any authorIds that still need resolving (legacy)
    const fallbackIds = [];
    for (const u of raw) {
      if (!u.createdBy && u.authorId) {
        const oid = toObjectIdSafe(u.authorId);
        if (oid) fallbackIds.push(String(oid));
      }
    }

    let fallbackMap = new Map();
    if (fallbackIds.length) {
      const uniq = Array.from(new Set(fallbackIds));
      const users = await User.find({ _id: { $in: uniq } })
        .select("firstName lastName username")
        .lean();
      fallbackMap = new Map(users.map((u) => [String(u._id), u]));
    }

    // 3) Shape response with authorName/authorUsername filled in
    const updates = raw.map((u) => {
      const createdByUser = u.createdBy;
      const fallbackUser = u.authorId
        ? fallbackMap.get(String(toObjectIdSafe(u.authorId)))
        : null;

      const authorUser = createdByUser || fallbackUser || null;

      return {
        _id: String(u._id),
        title: u.title,
        body: u.body,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        authorName: fullNameOrUsername(authorUser), // ← always filled or "—"
        authorUsername: authorUser?.username || "",
      };
    });

    return NextResponse.json({ updates }, { status: 200 });
  } catch (err) {
    console.error("GET /teams/:slug/updates failed:", err);
    return NextResponse.json(
      { error: "Failed to load updates" },
      { status: 500 }
    );
  }
}

/* =========================
   POST  /api/teams/:slug/updates
   (unchanged logic, but ensures createdBy is set)
   ========================= */
export async function POST(req, { params }) {
  try {
    await connectDB();
    const { slug } = await params;

    const me = await getCurrentUser();
    if (!me)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const team = await Team.findOne({ teamSlug: slug })
      .select("_id teamName teamSlug")
      .lean();
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const myMembership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
    })
      .select("role")
      .lean();
    if (!myMembership || !["manager", "coach"].includes(myMembership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, body } = await req.json();
    const t = String(title || "").trim();
    const b = String(body || "").trim();
    if (!t || !b) {
      return NextResponse.json(
        { error: "Title and body are required" },
        { status: 400 }
      );
    }

    // Set both createdBy (new) and authorId (legacy) for maximum compatibility
    const created = await TeamUpdate.create({
      teamId: team._id,
      title: t,
      body: b,
      createdBy: me._id,
      authorId: me._id,
    });

    // Notify members according to prefs (kept from your setup)
    const memberships = await TeamMember.find({
      teamId: team._id,
      role: { $in: ["member", "coach", "manager"] },
    })
      .select("userId")
      .lean();

    const wantsInApp = (user) =>
      user?.notificationSettings?.teamUpdates?.inApp ?? true;
    const wantsEmail = (user) =>
      user?.notificationSettings?.teamUpdates?.email ?? false;

    const link = `/teams/${team.teamSlug}/updates`;
    const strip = (html) => String(html || "").replace(/<[^>]+>/g, "");
    const preview = strip(b).slice(0, 240);
    const notifBody = `New team update: ${t}`;

    for (const m of memberships) {
      const u = await User.findById(m.userId)
        .select("email firstName lastName username notificationSettings")
        .lean();
      if (!u) continue;
      if (String(u._id) === String(me._id)) continue;

      if (wantsInApp(u)) {
        try {
          await Notification.create({
            user: u._id,
            notificationType: "team_update",
            notificationBody: notifBody,
            notificationLink: link,
            viewed: false,
          });
        } catch (e) {
          console.error("Notification create failed:", u._id, e);
        }
      }

      if (wantsEmail(u)) {
        const fullName = fullNameOrUsername(u);
        const html = baseEmailTemplate({
          title: `Team update: ${t}`,
          message: `
            <p>Hi ${fullName},</p>
            <p><strong>${team.teamName}</strong> posted a new update:</p>
            <blockquote style="border-left:4px solid #eee;padding-left:12px;color:#555;">
              ${preview}${preview.length >= 240 ? "…" : ""}
            </blockquote>
            <p>
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}${link}"
                 style="display:inline-block;padding:10px 16px;background:#1a73e8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
                Read the full update
              </a>
            </p>
          `,
        });

        try {
          await Mail.sendEmail({
            type: Mail.kinds.TEAM_UPDATE,
            toUser: u,
            subject: `[${team.teamName}] ${t}`,
            html,
            teamId: String(team._id),
          });
        } catch (e) {
          console.error("Mail send failed:", u.email, e);
        }
      }
    }

    // Shape one row for immediate UI
    const meName = fullNameOrUsername(me);
    return NextResponse.json(
      {
        update: {
          _id: String(created._id),
          title: created.title,
          body: created.body,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
          authorName: meName,
          authorUsername: me.username || "",
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /teams/:slug/updates failed:", err);
    return NextResponse.json(
      { error: "Failed to create update" },
      { status: 500 }
    );
  }
}
