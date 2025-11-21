// app/api/teams/[slug]/scouting-reports/[reportId]/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";
import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import Video from "@/models/videoModel";
import FamilyMember from "@/models/familyMemberModel";
import User from "@/models/userModel";
import { createNotification } from "@/lib/createNotification";

// centralized mailer + template
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

// ============================================================
// GET: Fetch a single team scouting report (includes crypto)
// ============================================================
export async function GET(_req, { params }) {
  try {
    await connectDB();
    const { slug, reportId } = await params; // Next 15: await params

    if (!Types.ObjectId.isValid(reportId)) {
      return NextResponse.json(
        { message: "Invalid report ID" },
        { status: 400 }
      );
    }

    // Tolerant team lookup (_ vs -)
    const team =
      (await Team.findOne({ teamSlug: slug }).select(
        "_id teamName teamSlug"
      )) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") }).select(
        "_id teamName teamSlug"
      )) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }).select(
        "_id teamName teamSlug"
      ));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const report = await TeamScoutingReport.findOne({
      _id: reportId,
      teamId: team._id,
    })
      .populate("videos")
      .populate("division")
      .lean();

    if (!report) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    // Return as-is; client will decrypt if report.crypto is present.
    return NextResponse.json({ report }, { status: 200 });
  } catch (err) {
    console.error("GET single scouting report error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH: Update a Scouting Report (supports crypto updates)
// ============================================================
export async function PATCH(req, context) {
  try {
    await connectDB();

    const { slug, reportId } = await context.params;
    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser || !currentUser._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Tolerant team lookup (_ vs -)
    const team =
      (await Team.findOne({ teamSlug: slug }).select(
        "_id teamName teamSlug"
      )) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") }).select(
        "_id teamName teamSlug"
      )) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }).select(
        "_id teamName teamSlug"
      ));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const report = await TeamScoutingReport.findOne({
      _id: reportId,
      teamId: team._id,
    });
    if (!report) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    // ---- Compute newly added assignees -------------------------------
    const prevKeys = new Set(
      (report.reportFor || []).map((e) => `${e.athleteType}:${e.athleteId}`)
    );
    const incoming = Array.isArray(body.reportFor)
      ? body.reportFor
      : report.reportFor || [];
    const seen = new Set();
    const dedupedIncoming = incoming.filter((e) => {
      const k = `${e.athleteId}-${e.athleteType}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const newlyAdded = dedupedIncoming.filter(
      (e) => !prevKeys.has(`${e.athleteType}:${e.athleteId}`)
    );

    const isEncryptedUpdate = !!(
      body.crypto && typeof body.crypto === "object"
    );

    // ---- Update allowed plaintext fields -----------------------------
    const sensitiveFields = [
      "athleteFirstName",
      "athleteLastName",
      "athleteNationalRank",
      "athleteWorldRank",
      "athleteClub",
      "athleteCountry",
      "athleteGrip",
      "athleteAttacks",
      "athleteAttackNotes",
    ];

    const allowedFields = [
      "title",
      "notes",
      "matchType",
      "athleteFirstName",
      "athleteLastName",
      "athleteNationalRank",
      "athleteWorldRank",
      "division",
      "weightCategory",
      "athleteClub",
      "athleteCountry",
      "athleteGrip",
      "athleteAttacks",
      "athleteAttackNotes",
      "reportFor",
    ];

    allowedFields.forEach((field) => {
      if (field === "reportFor") {
        report.reportFor = dedupedIncoming;
        return;
      }

      // If this is an encrypted update, ignore any incoming *sensitive* field values.
      if (isEncryptedUpdate && sensitiveFields.includes(field)) {
        return;
      }

      if (body[field] !== undefined) {
        report[field] = body[field];
      }
    });

    // ✅ optional crypto update (for encrypted payload changes)
    if (isEncryptedUpdate) {
      report.crypto = {
        version: body.crypto.version || 1,
        alg: body.crypto.alg || "TBK-AES-GCM-256",
        ivB64: body.crypto.ivB64 || "",
        ciphertextB64: body.crypto.ciphertextB64 || "",
        wrappedReportKeyB64: body.crypto.wrappedReportKeyB64 || "",
        teamKeyVersion:
          body.crypto.teamKeyVersion != null ? body.crypto.teamKeyVersion : 1,
      };

      // Enforce blank sensitive fields whenever crypto is present
      report.athleteFirstName = "";
      report.athleteLastName = "";
      report.athleteNationalRank = "";
      report.athleteWorldRank = "";
      report.athleteClub = "";
      report.athleteCountry = "";
      report.athleteGrip = "";
      report.athleteAttacks = [];
      report.athleteAttackNotes = "";
    }

    // ---- Save related entities ---------------------------------------
    await saveUnknownTechniques(
      Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
    );

    if (Array.isArray(body.newVideos) && body.newVideos.length) {
      for (const vid of body.newVideos) {
        const newVid = await Video.create({
          title: vid.title,
          notes: vid.notes,
          url: vid.url,
          report: report._id,
          createdBy: currentUser._id,
        });
        report.videos.push(newVid._id);
      }
    }

    if (Array.isArray(body.updatedVideos) && body.updatedVideos.length) {
      for (const vid of body.updatedVideos) {
        await Video.findByIdAndUpdate(vid._id, {
          title: vid.title,
          notes: vid.notes,
          url: vid.url,
        });
      }
    }

    if (Array.isArray(body.deletedVideos) && body.deletedVideos.length) {
      for (const videoId of body.deletedVideos) {
        await Video.findByIdAndDelete(videoId);
        report.videos = report.videos.filter((id) => id.toString() !== videoId);
      }
    }

    await report.save();

    // ---- Notify & email newly added assignees -------------------------
    try {
      await Promise.all(
        newlyAdded.map(async (entry) => {
          if (entry.athleteType === "user") {
            await createNotification({
              userId: entry.athleteId,
              type: "Scouting Report",
              body: `A scouting report was shared with you in ${team.teamName}`,
              link: `/teams/${team.teamSlug}/scouting-reports`,
            });

            const recipient = await User.findById(entry.athleteId);
            if (recipient) {
              const subject = `Scouting report shared in ${team.teamName}`;
              const message = `
                <p>Hi ${recipient.firstName || recipient.username},</p>
                <p>A scouting report has been shared with you in <strong>${
                  team.teamName
                }</strong>.</p>
                <p>You can review it here after signing in.</p>
                <p>
                  <a href="https://matscout.com/teams/${encodeURIComponent(
                    team.teamSlug
                  )}/scouting-reports"
                    style="display:inline-block;background-color:#1a73e8;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:bold;">
                    View Scouting Reports
                  </a>
                </p>
              `;
              const html = baseEmailTemplate({
                title: "New Scouting Report Shared",
                message,
                logoUrl:
                  "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
              });

              await Mail.sendEmail({
                type: Mail.kinds.SCOUTING_REPORT,
                toUser: recipient,
                subject,
                html,
                relatedUserId: entry.athleteId.toString(),
                teamId: team._id.toString(),
              });
            }
          } else if (entry.athleteType === "family") {
            const familyMember = await FamilyMember.findById(entry.athleteId);
            if (familyMember?.userId) {
              await createNotification({
                userId: familyMember.userId,
                type: "Scouting Report",
                body: `A scouting report was shared for ${familyMember.firstName} ${familyMember.lastName} in ${team.teamName}`,
                link: `/teams/${team.teamSlug}/scouting-reports`,
              });

              const parentUser = await User.findById(familyMember.userId);
              if (parentUser) {
                const subject = `Scouting report for ${familyMember.firstName} ${familyMember.lastName}`;
                const message = `
                  <p>Hi ${parentUser.firstName || parentUser.username},</p>
                  <p>A scouting report has been shared for <strong>${
                    familyMember.firstName
                  } ${familyMember.lastName}</strong> in <strong>${
                  team.teamName
                }</strong>.</p>
                  <p>You can review it here after signing in.</p>
                  <p>
                    <a href="https://matscout.com/teams/${encodeURIComponent(
                      team.teamSlug
                    )}/scouting-reports"
                      style="display:inline-block;background-color:#1a73e8;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:bold%;">
                      View Scouting Reports
                    </a>
                  </p>
                `;
                const html = baseEmailTemplate({
                  title: "New Scouting Report Shared",
                  message,
                  logoUrl:
                    "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
                });

                await Mail.sendEmail({
                  type: Mail.kinds.SCOUTING_REPORT,
                  toUser: parentUser,
                  subject,
                  html,
                  relatedUserId: familyMember._id.toString(),
                  teamId: team._id.toString(),
                });
              }
            }
          }
        })
      );
    } catch (notifyErr) {
      console.error("❌ Scouting report update notify/email error:", notifyErr);
    }

    return NextResponse.json(
      { message: "Report updated", report },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE: Delete Scouting Report (no crypto changes)
// ============================================================
export async function DELETE(_request, context) {
  await connectDB();

  const { slug, reportId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (!Types.ObjectId.isValid(reportId)) {
    return new NextResponse(JSON.stringify({ message: "Invalid report ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!currentUser || !currentUser._id) {
    return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return new NextResponse(JSON.stringify({ message: "Team not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const report = await TeamScoutingReport.findOne({
      _id: reportId,
      teamId: team._id,
    });

    if (!report) {
      return new NextResponse(
        JSON.stringify({ message: "Scouting report not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Delete associated videos if any
    if (report.videos && report.videos.length > 0) {
      await Video.deleteMany({ _id: { $in: report.videos } });
    }

    // Delete the report
    await TeamScoutingReport.findByIdAndDelete(reportId);

    return new NextResponse(
      JSON.stringify({
        message: "Scouting report and associated videos deleted",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("DELETE team scouting report error:", err);
    return new NextResponse(
      JSON.stringify({ message: "Server error: " + err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
