// app/api/teams/[slug]/scouting-reports/[reportId]/videos/[videoId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import Video from "@/models/videoModel";

/* ------------------------------------------------------------
   PATCH — Update a single video (title, url, and/or notes)
   Notes are blanked automatically if the parent report is encrypted.
------------------------------------------------------------ */
export async function PATCH(req, context) {
  try {
    await connectDB();
    const { slug, reportId, videoId } = await context.params;

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser || !currentUser._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch team with slug normalization
    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // Must belong to this team
    const report = await TeamScoutingReport.findOne({
      _id: reportId,
      teamId: team._id,
    }).lean();

    if (!report) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, notes, url } = body;

    const video = await Video.findById(videoId);
    if (!video) {
      return NextResponse.json({ message: "Video not found" }, { status: 404 });
    }

    if (!video.report || String(video.report) !== String(reportId)) {
      return NextResponse.json(
        { message: "Video not associated with this scouting report" },
        { status: 403 }
      );
    }

    const isEncrypted = !!report.crypto;

    // -------------------------------
    // Update fields
    // -------------------------------
    if (typeof title === "string") video.title = title;

    if (typeof url === "string") {
      video.url = url;
      try {
        const u = new URL(url);
        u.search = "";
        u.hash = "";
        video.urlCanonical = u.toString();
      } catch {
        video.urlCanonical = url;
      }
    }

    // Notes: allow plaintext only when report is NOT encrypted
    if (isEncrypted) {
      video.notes = "";
    } else if (typeof notes === "string") {
      video.notes = notes;
    }

    await video.save();

    return NextResponse.json(
      { message: "Video updated", video },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH video error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------
   DELETE — Remove a video from both the DB and the report
------------------------------------------------------------ */
export async function DELETE(req, context) {
  try {
    await connectDB();

    const { slug, reportId, videoId } = await context.params;
    const currentUser = await getCurrentUserFromCookies();

    if (!currentUser || !currentUser._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

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

    const video = await Video.findById(videoId);
    if (!video) {
      return NextResponse.json({ message: "Video not found" }, { status: 404 });
    }

    if (!video.report || video.report.toString() !== reportId) {
      return NextResponse.json(
        { message: "Video not associated with this report" },
        { status: 403 }
      );
    }

    // Delete video document
    await video.deleteOne();

    // Remove reference from report
    report.videos = report.videos.filter(
      (id) => id.toString() !== videoId.toString()
    );
    await report.save();

    return NextResponse.json(
      { message: "Video deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE team scouting report video error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
