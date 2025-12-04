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

// central mail system
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

/* -----------------------------------------------------------
   GET — Fetch Single Scouting Report
----------------------------------------------------------- */
export async function GET(_req, { params }) {
  try {
    await connectDB();
    const { slug, reportId } = await params;

    if (!Types.ObjectId.isValid(reportId)) {
      return NextResponse.json(
        { message: "Invalid report ID" },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ report }, { status: 200 });
  } catch (err) {
    console.error("GET single scouting report error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   PATCH — Update Scouting Report (FULL Encryption Mode)
----------------------------------------------------------- */
export async function PATCH(req, context) {
  try {
    await connectDB();

    const { slug, reportId } = await context.params;
    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser?._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // tolerant team lookup
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

    if (!team)
      return NextResponse.json({ message: "Team not found" }, { status: 404 });

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

    /* -----------------------------------------------------------
       Dedupe reportFor + detect newly-added assignees
    ----------------------------------------------------------- */
    const prevKeys = new Set(
      (report.reportFor || []).map((e) => `${e.athleteType}:${e.athleteId}`)
    );

    const incomingList = Array.isArray(body.reportFor) ? body.reportFor : [];
    const seen = new Set();
    const dedupedIncoming = incomingList.filter((e) => {
      const k = `${e.athleteType}:${e.athleteId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const newlyAdded = dedupedIncoming.filter(
      (e) => !prevKeys.has(`${e.athleteType}:${e.athleteId}`)
    );

    /* -----------------------------------------------------------
       Encryption Mode Trigger
    ----------------------------------------------------------- */
    const isEncryptedUpdate = !!(
      body.crypto && typeof body.crypto === "object"
    );

    /* -----------------------------------------------------------
       Sensitive Fields — MUST be blanked in encrypted mode
       (Matches POST behavior exactly)
    ----------------------------------------------------------- */
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

    /* -----------------------------------------------------------
       Allowed plain fields
    ----------------------------------------------------------- */
    const allowedFields = [
      "title",
      "notes",
      "matchType",
      "division",
      "weightCategory",
      "weightLabel",
      "weightUnit",
      "reportFor",
    ];

    /* -----------------------------------------------------------
       Apply updates
    ----------------------------------------------------------- */
    if (body.reportFor) {
      report.reportFor = dedupedIncoming;
    }

    for (const field of allowedFields) {
      if (field === "reportFor") continue;
      if (body[field] !== undefined) {
        report[field] = body[field];
      }
    }

    /* -----------------------------------------------------------
       ENCRYPTION MODE: store crypto + blank sensitive fields
    ----------------------------------------------------------- */
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

      // BLANK ALL sensitive fields
      for (const f of sensitiveFields) {
        report[f] = Array.isArray(report[f]) ? [] : "";
      }
    } else {
      // Only apply sensitive fields if NOT encrypted
      for (const f of sensitiveFields) {
        if (body[f] !== undefined) {
          report[f] = body[f];
        }
      }
    }

    /* -----------------------------------------------------------
       Save unknown techniques
    ----------------------------------------------------------- */
    await saveUnknownTechniques(
      Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
    );

    /* -----------------------------------------------------------
       VIDEO LOGIC
       - In encrypted mode: NO plaintext notes stored
       - In plaintext mode: normal video storage
    ----------------------------------------------------------- */

    // NEW VIDEOS
    if (Array.isArray(body.newVideos)) {
      for (const vid of body.newVideos) {
        const doc = {
          report: report._id,
          createdBy: currentUser._id,
          title: vid.title || "",
          url: vid.url || "",
        };

        doc.notes = isEncryptedUpdate ? "" : vid.notes || "";

        const newVid = await Video.create(doc);
        report.videos.push(newVid._id);
      }
    }

    // UPDATED VIDEOS
    if (Array.isArray(body.updatedVideos)) {
      for (const vid of body.updatedVideos) {
        const update = {
          title: vid.title,
          url: vid.url,
        };

        update.notes = isEncryptedUpdate ? "" : vid.notes || "";

        await Video.findByIdAndUpdate(vid._id, update);
      }
    }

    // DELETED VIDEOS
    if (Array.isArray(body.deletedVideos)) {
      for (const videoId of body.deletedVideos) {
        await Video.findByIdAndDelete(videoId);
        report.videos = report.videos.filter(
          (id) => id.toString() !== videoId.toString()
        );
      }
    }

    await report.save();

    /* -----------------------------------------------------------
       NOTIFICATIONS + EMAILS for newly added reportFor
    ----------------------------------------------------------- */
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
              const msg = `
                <p>Hi ${recipient.firstName || recipient.username},</p>
                <p>A scouting report has been shared with you in <strong>${
                  team.teamName
                }</strong>.</p>
                <p>You can review it after signing in.</p>
              `;
              const html = baseEmailTemplate({
                title: "New Scouting Report Shared",
                message: msg,
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
          }

          if (entry.athleteType === "family") {
            const fm = await FamilyMember.findById(entry.athleteId);
            if (!fm?.userId) return;

            await createNotification({
              userId: fm.userId,
              type: "Scouting Report",
              body: `A scouting report was shared for ${fm.firstName} ${fm.lastName} in ${team.teamName}`,
              link: `/teams/${team.teamSlug}/scouting-reports`,
            });

            const parent = await User.findById(fm.userId);
            if (parent) {
              const subject = `Scouting report for ${fm.firstName} ${fm.lastName}`;
              const msg = `
                <p>Hi ${parent.firstName || parent.username},</p>
                <p>A scouting report has been shared for <strong>${
                  fm.firstName
                } ${fm.lastName}</strong> in <strong>${
                team.teamName
              }</strong>.</p>
              `;
              const html = baseEmailTemplate({
                title: "New Scouting Report Shared",
                message: msg,
                logoUrl:
                  "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
              });

              await Mail.sendEmail({
                type: Mail.kinds.SCOUTING_REPORT,
                toUser: parent,
                subject,
                html,
                relatedUserId: fm._id.toString(),
                teamId: team._id.toString(),
              });
            }
          }
        })
      );
    } catch (e) {
      console.error("Email notify error:", e);
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

/* -----------------------------------------------------------
   DELETE — Remove Report + Videos
----------------------------------------------------------- */
export async function DELETE(_req, context) {
  await connectDB();

  const { slug, reportId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (!Types.ObjectId.isValid(reportId)) {
    return NextResponse.json({ message: "Invalid report ID" }, { status: 400 });
  }

  if (!currentUser?._id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

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

    // delete videos
    if (report.videos?.length) {
      await Video.deleteMany({ _id: { $in: report.videos } });
    }

    await TeamScoutingReport.findByIdAndDelete(reportId);

    return NextResponse.json(
      { message: "Scouting report and associated videos deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
