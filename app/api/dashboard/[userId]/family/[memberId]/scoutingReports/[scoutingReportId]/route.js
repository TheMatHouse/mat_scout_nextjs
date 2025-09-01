import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";

export const dynamic = "force-dynamic";

const isValid = (id) => !!id && Types.ObjectId.isValid(id);

// ---------- PATCH: Update a family member's scouting report ----------
export async function PATCH(req, { params }) {
  await connectDB();

  const { userId, memberId, scoutingReportId } = params || {};
  const currentUser = await getCurrentUserFromCookies();

  // Authn/Authz + param checks
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isValid(userId) || !isValid(memberId) || !isValid(scoutingReportId)) {
    return NextResponse.json({ message: "Invalid ID(s)" }, { status: 400 });
  }

  try {
    const body = await req.json();

    // Build a filter that matches BOTH historical and current shapes
    const filter = {
      _id: scoutingReportId,
      createdById: userId,
      $or: [
        // Preferred: top-level fields present
        { athleteId: memberId, athleteType: "family" },
        // Historical: reportFor array used
        {
          reportFor: {
            $elemMatch: { athleteId: memberId, athleteType: "family" },
          },
        },
      ],
    };

    const report = await ScoutingReport.findOne(filter);
    if (!report) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    // Extract and update fields
    const {
      athleteFirstName,
      athleteLastName,
      athleteCountry,
      athleteClub,
      athleteWorldRank,
      athleteNationalRank,
      athleteRank,
      athleteGrip,
      matchType,
      weightCategory,
      division,
      athleteAttacks,
      athleteAttackNotes,
      accessList,

      updatedVideos = [],
      newVideos = [],
      deletedVideos = [],
    } = body || {};

    Object.assign(report, {
      athleteFirstName,
      athleteLastName,
      athleteCountry,
      athleteClub,
      athleteWorldRank,
      athleteNationalRank,
      athleteRank,
      athleteGrip,
      matchType,
      weightCategory,
      division,
      athleteAttacks,
      athleteAttackNotes,
      accessList,
      updatedAt: new Date(),
    });

    // Ensure techniques exist (created unapproved if missing)
    if (Array.isArray(athleteAttacks)) {
      await saveUnknownTechniques(athleteAttacks);
    }

    // Update existing videos
    if (Array.isArray(updatedVideos) && updatedVideos.length) {
      await Promise.all(
        updatedVideos
          .filter((v) => v?._id && isValid(v._id))
          .map((v) =>
            Video.findByIdAndUpdate(v._id, {
              $set: {
                title: v.title || "",
                notes: v.notes || "",
                url: v.url || "",
              },
            })
          )
      );
    }

    // Delete removed videos
    if (Array.isArray(deletedVideos) && deletedVideos.length) {
      await Video.deleteMany({ _id: { $in: deletedVideos } });
      report.videos = (report.videos || []).filter(
        (vidId) => !deletedVideos.includes(String(vidId))
      );
    }

    // Add new videos
    if (Array.isArray(newVideos) && newVideos.length) {
      const created = await Video.insertMany(
        newVideos.map((v) => ({
          title: v.title || "",
          notes: v.notes || "",
          url: v.url || "",
          // keep consistent with your existing Video schema link field:
          scoutingReport: report._id,
          createdBy: userId,
        }))
      );
      report.videos = [...(report.videos || []), ...created.map((v) => v._id)];
    }

    await report.save();

    return NextResponse.json({
      message: "Family scouting report updated successfully.",
    });
  } catch (err) {
    console.error("PATCH family scouting error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

// ---------- DELETE: Delete ONE scouting report (and its videos) ----------
export async function DELETE(_req, { params }) {
  await connectDB();

  const { userId, memberId, scoutingReportId } = params || {};
  const currentUser = await getCurrentUserFromCookies();

  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isValid(userId) || !isValid(memberId) || !isValid(scoutingReportId)) {
    return NextResponse.json({ message: "Invalid ID(s)" }, { status: 400 });
  }

  try {
    // Same dual-shape filter
    const filter = {
      _id: scoutingReportId,
      createdById: userId,
      $or: [
        { athleteId: memberId, athleteType: "family" },
        {
          reportFor: {
            $elemMatch: { athleteId: memberId, athleteType: "family" },
          },
        },
      ],
    };

    const report = await ScoutingReport.findOne(filter);
    if (!report) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    // Delete associated videos that reference this report
    if (Array.isArray(report.videos) && report.videos.length) {
      await Video.deleteMany({ _id: { $in: report.videos } });
    }
    // If your Video schema also stores a direct link, you can optionally:
    // await Video.deleteMany({ scoutingReport: report._id });

    await ScoutingReport.deleteOne({ _id: report._id });

    return NextResponse.json(
      { message: "Scouting report deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE family scouting error:", err);
    return NextResponse.json(
      { message: "Server error while deleting report" },
      { status: 500 }
    );
  }
}
