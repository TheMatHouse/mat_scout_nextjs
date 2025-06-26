import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth";
import Video from "@/models/videoModel";
import ScoutingReport from "@/models/scoutingReportModel";

// export async function PATCH(request, context) {
//   await connectDB();
//   const { userId, memberId, scoutingReportId, videoId } = context.params;
//   const currentUser = await getCurrentUserFromCookies();

//   if (
//     !Types.ObjectId.isValid(userId) ||
//     !Types.ObjectId.isValid(memberId) ||
//     !Types.ObjectId.isValid(scoutingReportId) ||
//     !Types.ObjectId.isValid(videoId)
//   ) {
//     return NextResponse.json(
//       { message: "Invalid ID(s) provided" },
//       { status: 400 }
//     );
//   }

//   if (!currentUser || String(currentUser._id) !== String(userId)) {
//     return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     const updates = await request.json();
//     const updated = await Video.findOneAndUpdate(
//       { _id: videoId, report: scoutingReportId },
//       updates,
//       { new: true }
//     );

//     if (!updated) {
//       return NextResponse.json({ message: "Video not found" }, { status: 404 });
//     }

//     return NextResponse.json(
//       { message: "Video updated", video: updated },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error updating family video:", error);
//     return NextResponse.json(
//       { message: "Failed to update video" },
//       { status: 500 }
//     );
//   }
// }

export async function DELETE(request, context) {
  await connectDB();
  console.log("hit the video id route");
  const { userId, memberId, scoutingReportId, videoId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  console.log("userId ", userId);
  console.log("memberId ", memberId);
  console.log("scoutingReportId ", scoutingReportId);
  console.log("videoId ", videoId);
  // ✅ Validate all IDs
  if (
    !Types.ObjectId.isValid(userId) ||
    !Types.ObjectId.isValid(memberId) ||
    !Types.ObjectId.isValid(scoutingReportId) ||
    !Types.ObjectId.isValid(videoId)
  ) {
    return NextResponse.json(
      { message: "Invalid ID(s) provided" },
      { status: 400 }
    );
  }

  // ✅ Authenticate
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // ✅ Delete the video
    const deleted = await Video.findOneAndDelete({
      _id: videoId,
      report: scoutingReportId,
    });

    if (!deleted) {
      return NextResponse.json({ message: "Video not found" }, { status: 404 });
    }

    // ✅ Remove video reference from scouting report
    await ScoutingReport.findByIdAndUpdate(scoutingReportId, {
      $pull: { videos: videoId },
    });

    return NextResponse.json({ message: "Video deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting family video:", error);
    return NextResponse.json(
      { message: "Failed to delete video" },
      { status: 500 }
    );
  }
}
