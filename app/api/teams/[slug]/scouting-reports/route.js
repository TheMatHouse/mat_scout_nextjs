// app/api/teams/[slug]/scoutingReports/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";
import Team from "@/models/teamModel";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";
import { createNotification } from "@/lib/createNotification"; // ✅ Added

export async function POST(req, context) {
  try {
    await connectDB();

    const { slug } = await context.params;
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
      createdByName: `${currentUser.firstName} ${currentUser.lastName}`,
    });

    // ✅ Use shared utility to save any new techniques
    await saveUnknownTechniques(
      Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
    );

    // Save new videos and link to report
    const incomingVideos = body.videos || body.newVideos || [];
    const videoIds = [];

    for (const vid of incomingVideos) {
      const video = await Video.create({
        ...vid,
        report: newReport._id,
        createdBy: currentUser._id,
      });
      videoIds.push(video._id);
    }

    if (videoIds.length) {
      newReport.videos = videoIds;
      await newReport.save();
    }

    // ✅ Notifications for each athlete in reportFor
    try {
      for (const entry of dedupedReportFor) {
        if (entry.athleteType === "user") {
          // Notify the user directly
          await createNotification({
            userId: entry.athleteId,
            type: "Scouting Report",
            body: `A new scouting report was added for you in ${team.teamName}`,
            link: `/teams/${slug}?tab=scouting-reports`,
          });
        } else if (entry.athleteType === "family") {
          // Get parent user for family member
          const familyMember = await FamilyMember.findById(entry.athleteId);
          if (familyMember && familyMember.userId) {
            await createNotification({
              userId: familyMember.userId,
              type: "Scouting Report",
              body: `A new scouting report was added for ${familyMember.firstName} ${familyMember.lastName} in ${team.teamName}`,
              link: `/teams/${slug}?tab=scouting-reports`,
            });
          }
        }
      }
    } catch (notifErr) {
      console.error(
        "❌ Failed to create scouting report notifications:",
        notifErr
      );
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

export async function GET(request, context) {
  try {
    const { slug } = await context.params;
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
