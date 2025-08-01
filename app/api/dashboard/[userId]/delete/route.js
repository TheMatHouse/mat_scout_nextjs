import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import MatchReport from "@/models/matchReportModel";
import ScoutingReport from "@/models/scoutingReportModel";
import Notification from "@/models/notification";
import UserStyle from "@/models/userStyleModel";
import Video from "@/models/videoModel";
import { cookies } from "next/headers";

export async function DELETE(req, { params }) {
  await connectDB();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = currentUser._id;

    // ✅ Delete related data
    await Notification.deleteMany({ userId });
    await UserStyle.deleteMany({ userId });
    await MatchReport.deleteMany({ userId });

    const familyMembers = await FamilyMember.find({ userId });
    const familyMemberIds = familyMembers.map((fm) => fm._id);

    await FamilyMember.deleteMany({ userId });
    await MatchReport.deleteMany({ familyMemberId: { $in: familyMemberIds } });

    const userScoutingReports = await ScoutingReport.find({ userId });
    const familyScoutingReports = await ScoutingReport.find({
      familyMemberId: { $in: familyMemberIds },
    });

    const allReports = [...userScoutingReports, ...familyScoutingReports];
    const videoIds = allReports.flatMap((report) => report.videos || []);
    if (videoIds.length > 0) {
      await Video.deleteMany({ _id: { $in: videoIds } });
    }

    await ScoutingReport.deleteMany({
      $or: [{ userId }, { familyMemberId: { $in: familyMemberIds } }],
    });

    await User.findByIdAndDelete(userId);

    // ✅ Clear token cookie
    const response = NextResponse.json({
      message: "Account deleted successfully",
    });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { message: "Error deleting account" },
      { status: 500 }
    );
  }
}
