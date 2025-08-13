// app/api/teams/[slug]/scouting-reports/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";
import Team from "@/models/teamModel";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";
import User from "@/models/userModel";
import { createNotification } from "@/lib/createNotification";

// ⬇️ new: centralized mailer + template
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export async function POST(req, { params }) {
  try {
    await connectDB();

    const { slug } = params;
    if (!slug) {
      return NextResponse.json(
        { message: "Missing team slug" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser || !currentUser._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Deduplicate reportFor
    const seen = new Set();
    const dedupedReportFor = (body.reportFor || []).filter((entry) => {
      const key = `${entry.athleteId}-${entry.athleteType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Create the report without videos
    const newReport = await ScoutingReport.create({
      ...body,
      videos: [],
      reportFor: dedupedReportFor,
      teamId: team._id,
      createdById: currentUser._id,
      createdByName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
    });

    // Save unknown techniques
    await saveUnknownTechniques(
      Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
    );

    // Save new videos and link to report
    const incomingVideos = body.videos || body.newVideos || [];
    if (incomingVideos.length) {
      const videoDocs = await Promise.all(
        incomingVideos.map((vid) =>
          Video.create({
            ...vid,
            report: newReport._id,
            createdBy: currentUser._id,
          })
        )
      );
      newReport.videos = videoDocs.map((v) => v._id);
      await newReport.save();
    }

    // In-app notifications + emails per assignment
    try {
      await Promise.all(
        dedupedReportFor.map(async (entry) => {
          if (entry.athleteType === "user") {
            // Notify & email the user directly
            await createNotification({
              userId: entry.athleteId,
              type: "Scouting Report",
              body: `A new scouting report was added for you in ${team.teamName}`,
              link: `/teams/${slug}?tab=scouting-reports`,
            });

            const recipient = await User.findById(entry.athleteId);
            if (recipient) {
              const subject = `New scouting report in ${team.teamName}`;
              const message = `
                <p>Hi ${recipient.firstName || recipient.username},</p>
                <p>A new scouting report has been created for you in <strong>${
                  team.teamName
                }</strong>.</p>
                <p>You can review it here after signing in.</p>
                <p>
                  <a href="https://matscout.com/teams/${encodeURIComponent(
                    slug
                  )}?tab=scouting-reports"
                    style="display:inline-block;background-color:#1a73e8;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:bold;">
                    View Scouting Reports
                  </a>
                </p>
              `;
              const html = baseEmailTemplate({
                title: "New Scouting Report",
                message,
                logoUrl:
                  "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
              });

              // Respect user prefs + 24h dedupe (relatedUserId = athlete userId)
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
            // Notify & email the parent of the family member
            const familyMember = await FamilyMember.findById(entry.athleteId);
            if (familyMember?.userId) {
              await createNotification({
                userId: familyMember.userId,
                type: "Scouting Report",
                body: `A new scouting report was added for ${familyMember.firstName} ${familyMember.lastName} in ${team.teamName}`,
                link: `/teams/${slug}?tab=scouting-reports`,
              });

              const parentUser = await User.findById(familyMember.userId);
              if (parentUser) {
                const subject = `New scouting report for ${familyMember.firstName} ${familyMember.lastName}`;
                const message = `
                  <p>Hi ${parentUser.firstName || parentUser.username},</p>
                  <p>A new scouting report has been created for <strong>${
                    familyMember.firstName
                  } ${familyMember.lastName}</strong> in <strong>${
                  team.teamName
                }</strong>.</p>
                  <p>You can review it here after signing in.</p>
                  <p>
                    <a href="https://matscout.com/teams/${encodeURIComponent(
                      slug
                    )}?tab=scouting-reports"
                      style="display:inline-block;background-color:#1a73e8;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:bold;">
                      View Scouting Reports
                    </a>
                  </p>
                `;
                const html = baseEmailTemplate({
                  title: "New Scouting Report",
                  message,
                  logoUrl:
                    "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
                });

                // relatedUserId = familyMember._id to keep dedupe scoped to that athlete
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
      // Don't fail the request for notification/email issues
      console.error("❌ Scouting report notify/email error:", notifyErr);
    }

    return NextResponse.json(
      { message: "Scouting report created", report: newReport },
      { status: 201 }
    );
  } catch (err) {
    console.error("Scouting Report POST error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

export async function GET(_request, { params }) {
  try {
    const { slug } = params;
    await connectDB();

    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const scoutingReports = await ScoutingReport.find({ teamId: team._id })
      .populate("videos")
      .sort({ createdAt: -1 });

    return NextResponse.json({ scoutingReports }, { status: 200 });
  } catch (err) {
    console.error("GET team scoutingReports error:", err);
    return NextResponse.json(
      { message: "Failed to fetch scouting reports", error: err.message },
      { status: 500 }
    );
  }
}
