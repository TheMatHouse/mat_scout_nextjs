import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import ScoutingReport from "@/models/scoutingReportModel";
import User from "@/models/userModel";
import { getCurrentUser } from "@/lib/auth-server";
import { createNotification } from "@/lib/createNotification";
import { sendEmail } from "@/lib/email/email";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export const dynamic = "force-dynamic";

// -------------------------------------------------------------
// GET — MUST return wrappedTBK for TeamUnlockGate
// -------------------------------------------------------------
export async function GET(req, ctx) {
  try {
    await connectDB();

    const { slug } = await ctx.params;
    const url = new URL(req.url);
    const wantFullSecurity = url.searchParams.get("fullSecurity") === "1";

    const actor = await getCurrentUser();
    const team = await Team.findOne({ teamSlug: slug }).lean();

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const isOwner = actor && String(team.user) === String(actor._id);

    const minimalSecurity = {
      lockEnabled: !!team.security?.lockEnabled,
      encVersion: team.security?.encVersion || "v1",
    };

    const base = {
      _id: String(team._id),
      teamName: team.teamName,
      teamSlug: team.teamSlug,
      logoURL: team.logoURL,
      logoType: team.logoType,
      user: String(team.user),
    };

    // 🔥 If user is owner and requests full security, return full AES-GCM block
    if (isOwner && wantFullSecurity) {
      return NextResponse.json({
        team: {
          ...base,
          security: {
            ...minimalSecurity,
            kdf: {
              saltB64: team.security?.kdf?.saltB64 || "",
              iterations: team.security?.kdf?.iterations || 250000,
            },
            verifierB64: team.security?.verifierB64 || "",
            wrappedTBK: team.security?.wrappedTBK || null, // ← REQUIRED
          },
        },
      });
    }

    // 🔥 Normal fetch — MUST still return wrappedTBK if lock is enabled
    if (team.security?.lockEnabled) {
      return NextResponse.json({
        team: {
          ...base,
          security: {
            ...minimalSecurity,
            kdf: {
              saltB64: team.security?.kdf?.saltB64 || "",
              iterations: team.security?.kdf?.iterations || 250000,
            },
            verifierB64: team.security?.verifierB64 || "",
            wrappedTBK: team.security?.wrappedTBK || null, // ← REQUIRED
          },
        },
      });
    }

    // Lock disabled → basic
    return NextResponse.json({
      team: {
        ...base,
        security: minimalSecurity,
      },
    });
  } catch (err) {
    console.error("Team GET error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

// -------------------------------------------------------------
// PATCH — unchanged
// -------------------------------------------------------------
export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;
    const body = await req.json().catch(() => ({}));

    // Disable lock
    if (body?.lockEnabled === false) {
      const res = await Team.updateOne(
        { teamSlug: slug },
        { $set: { "security.lockEnabled": false } }
      );

      if (res.matchedCount === 0) {
        return NextResponse.json(
          { message: "Team not found" },
          { status: 404 }
        );
      }

      const fresh = await Team.findOne({ teamSlug: slug }).lean();
      return NextResponse.json({
        message: "Team lock disabled",
        team: {
          _id: String(fresh?._id || ""),
          teamSlug: fresh?.teamSlug || slug,
          security: fresh?.security || null,
        },
      });
    }

    // Enable/update lock
    const saltB64 = body?.kdf?.saltB64?.trim();
    const iterations = Number(body?.kdf?.iterations ?? 0);
    const verifierB64 = body?.verifierB64?.trim();

    if (!saltB64 || !iterations || !verifierB64) {
      return NextResponse.json(
        { message: "Missing required fields for security update" },
        { status: 400 }
      );
    }

    await Team.updateOne(
      { teamSlug: slug },
      {
        $set: {
          security: {
            lockEnabled: true,
            encVersion: "v1",
            kdf: { saltB64, iterations },
            verifierB64,
            wrappedTBK: body?.wrappedTBK ?? undefined, // safe
          },
        },
      }
    );

    const fresh = await Team.findOne({ teamSlug: slug }).lean();
    return NextResponse.json({
      message: "Team password updated",
      team: {
        _id: String(fresh?._id || ""),
        teamSlug: fresh?.teamSlug || slug,
        security: fresh?.security || null,
      },
    });
  } catch (err) {
    console.error("security PATCH error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

// -------------------------------------------------------------
// DELETE — unchanged
// -------------------------------------------------------------
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { slug } = params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.user.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await TeamMember.find({ teamId: team._id });
    const memberUserIds = members
      .map((m) => m.userId?.toString())
      .filter((id) => id && id !== currentUser._id.toString());

    await Promise.all(
      memberUserIds.map((userId) =>
        createNotification({
          userId,
          type: "Team Deleted",
          body: `${team.teamName} has been deleted`,
          link: "/teams",
        })
      )
    );

    try {
      const users = await User.find({ _id: { $in: memberUserIds } });
      await Promise.all(
        users.map((u) => {
          const html = baseEmailTemplate({
            title: "Team Deleted",
            message: `
              <p>Hello ${u.firstName || u.username},</p>
              <p>The team <strong>${team.teamName}</strong> was deleted.</p>
            `,
            logoUrl:
              "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
          });

          return sendEmail({
            to: u.email,
            subject: "Team deleted",
            html,
          });
        })
      );
    } catch {}

    await TeamMember.deleteMany({ teamId: team._id });
    await ScoutingReport.deleteMany({ teamId: team._id });
    await Team.deleteOne({ _id: team._id });

    return NextResponse.json({ success: true, message: "Team deleted" });
  } catch (err) {
    console.error("DELETE team error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
