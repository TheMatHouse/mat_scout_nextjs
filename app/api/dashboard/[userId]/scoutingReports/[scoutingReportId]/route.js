import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import User from "@/models/userModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { ensureTechniques } from "@/lib/ensureTechniques";

export const dynamic = "force-dynamic";

// ---- helpers ----
const cleanList = (arr) => [
  ...new Set((arr || []).map((s) => String(s || "").trim()).filter(Boolean)),
];
const asLower = (arr) => arr.map((s) => s.toLowerCase());
const isValidId = (id) => !!id && Types.ObjectId.isValid(id);

// PATCH: Update a scouting report
export async function PATCH(request, context) {
  await connectDB();
  const { userId, scoutingReportId } = context.params || {};
  const currentUser = await getCurrentUserFromCookies();

  if (!isValidId(userId) || !isValidId(scoutingReportId)) {
    return NextResponse.json({ message: "Invalid ID(s)" }, { status: 400 });
  }
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Ensure techniques exist (create missing; no dup if an unapproved exists)
    if (Array.isArray(body.athleteAttacks)) {
      await ensureTechniques(cleanList(body.athleteAttacks));
    }

    // Update existing videos
    if (Array.isArray(body.updatedVideos)) {
      for (const v of body.updatedVideos) {
        if (v?._id && Types.ObjectId.isValid(v._id)) {
          await Video.findByIdAndUpdate(v._id, {
            $set: {
              title: v.title ?? "",
              notes: v.notes ?? "",
              url: v.url ?? "",
            },
          });
        }
      }
    }

    // Delete removed videos
    if (Array.isArray(body.deletedVideos) && body.deletedVideos.length) {
      await Video.deleteMany({ _id: { $in: body.deletedVideos } });
      await ScoutingReport.findByIdAndUpdate(scoutingReportId, {
        $pull: { videos: { $in: body.deletedVideos } },
      });
    }

    // Add new videos
    if (Array.isArray(body.newVideos) && body.newVideos.length) {
      const created = await Video.insertMany(
        body.newVideos.map((n) => ({
          title: n.title || "",
          notes: n.notes || "",
          url: n.url || "",
          // IMPORTANT: use the same field you use in POST; earlier we used "report"
          report: scoutingReportId,
          createdBy: userId,
        })),
        { ordered: false }
      );
      await ScoutingReport.findByIdAndUpdate(scoutingReportId, {
        $push: { videos: { $each: created.map((x) => x._id) } },
      });
    }

    // Remove video arrays from main update, normalize attacks
    const {
      updatedVideos,
      deletedVideos,
      newVideos,
      videos, // ignore direct overwrite
      athleteAttacks,
      ...rest
    } = body;

    const updateDoc = {
      ...rest,
      updatedAt: new Date(),
    };

    if (Array.isArray(athleteAttacks)) {
      updateDoc.athleteAttacks = asLower(cleanList(athleteAttacks));
    }

    const updated = await ScoutingReport.findOneAndUpdate(
      { _id: scoutingReportId, createdById: userId },
      { $set: updateDoc },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Report updated", report: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating scouting report:", error);
    return NextResponse.json(
      { message: "Failed to update report", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete a scouting report (+ associated videos) and unlink from user
export async function DELETE(_request, context) {
  await connectDB();
  const { userId, scoutingReportId } = context.params || {};

  if (!isValidId(userId) || !isValidId(scoutingReportId)) {
    return NextResponse.json(
      { message: "Invalid ID(s) provided" },
      { status: 400 }
    );
  }

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await ScoutingReport.findOne({
      _id: scoutingReportId,
      createdById: userId,
    });

    if (!report) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    const videoIds = Array.isArray(report.videos) ? report.videos : [];
    if (videoIds.length) {
      await Video.deleteMany({ _id: { $in: videoIds } });
    }

    await report.deleteOne();
    // Detach from user doc
    await User.findByIdAndUpdate(userId, {
      $pull: { scoutingReports: report._id },
    });

    return NextResponse.json(
      { message: "Scouting report and associated videos deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting scouting report:", error);
    return NextResponse.json(
      { message: "Failed to delete scouting report" },
      { status: 500 }
    );
  }
}
