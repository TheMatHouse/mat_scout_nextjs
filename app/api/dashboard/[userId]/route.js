import { NextResponse } from "next/server";
import { Types, ObjectId } from "mongoose";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";

export async function GET(request, { params }) {
  const { userId } = params;

  if (!userId || !Types.ObjectId.isValid(userId)) {
    return new NextResponse(
      JSON.stringify({ message: "Invalid or missing user id" }),
      { status: 400 }
    );
  }

  const mongoId = new Types.ObjectId(userId);

  try {
    await connectDB();

    const user = await User.aggregate([
      { $match: { _id: mongoId } },
      {
        $lookup: {
          from: "userstyles",
          localField: "_id",
          foreignField: "userId",
          as: "userStyles",
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "user",
          as: "teams",
        },
      },
      {
        $lookup: {
          from: "teammembers",
          localField: "_id",
          foreignField: "userId",
          as: "teamMembers",
        },
      },
      {
        $lookup: {
          from: "scoutingreports",
          localField: "_id",
          foreignField: "athletes",
          pipeline: [
            {
              $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "report",
                as: "videos",
              },
            },
          ],
          as: "scoutingReports",
        },
      },
      {
        $lookup: {
          from: "scoutingreports",
          localField: "_id",
          foreignField: "access",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "athletes",
                foreignField: "_id",
                as: "shareAthletes",
              },
            },
            {
              $lookup: {
                from: "familymembers",
                localField: "familyMembers",
                foreignField: "_id",
                pipeline: [
                  {
                    $lookup: {
                      from: "users",
                      localField: "userId",
                      foreignField: "_id",
                      as: "guardian",
                    },
                  },
                ],
                as: "shareFamilyMembers",
              },
            },
          ],
          as: "scoutingReportsSharedWithMe",
        },
      },
      {
        $lookup: {
          from: "matchreports",
          localField: "_id",
          foreignField: "athlete",
          as: "matchReports",
        },
      },
      {
        $lookup: {
          from: "familymembers",
          localField: "_id",
          foreignField: "userId",
          pipeline: [
            {
              $lookup: {
                from: "matchreports",
                localField: "_id",
                foreignField: "athlete",
                as: "familyMatchReports",
              },
            },
            {
              $lookup: {
                from: "scoutingreports",
                localField: "_id",
                foreignField: "familyMembers",
                as: "familyScoutingReports",
              },
            },
            {
              $lookup: {
                from: "teammembers",
                localField: "_id",
                foreignField: "familyMemberId",
                as: "familyTeamMembers",
              },
            },
          ],
          as: "familyMembers",
        },
      },
      {
        $project: {
          tokens: 0,
          password: 0,
          "userStyle._id": 0,
          "userInfo.email": 0,
          "userInfo.tokens": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.password": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.tokens": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.avatar": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.avatarType": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.isAdmin": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.verified": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.updatedAt": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.createdAt": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.city": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.state": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.country": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian._id": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.email": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.lastLogin": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.gender": 0,
          "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.allowPublic": 0,
        },
      },
    ]);

    if (!user || user.length === 0) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new NextResponse(JSON.stringify({ user: user[0] }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return new NextResponse(
      JSON.stringify({ message: "Error fetching user: " + error.message }),
      { status: 500 }
    );
  }
}

export const PATCH = async (request, { params }) => {
  try {
    const { userId: mongoId } = params;

    const auth = getAuth(request);
    const clerkId = auth?.userId;

    console.log("mongo id ", mongoId);
    console.log("clerk id ", clerkId);

    if (!clerkId) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized – no Clerk ID" }),
        { status: 401 }
      );
    }

    await connectDB();

    const mongoUser = await getUserByClerkId(clerkId);
    if (!mongoUser || mongoUser._id.toString() !== mongoId) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized – not your account" }),
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid JSON format" }),
        { status: 400 }
      );
    }

    const { city, state, country, gender } = body;
    const allowPublic =
      body.allowPublic === "Public" || body.allowPublic === true;

    let updatedUser;
    try {
      updatedUser = await User.findByIdAndUpdate(
        mongoId,
        { city, state, country, gender, allowPublic },
        { new: true }
      );
    } catch (err) {
      console.error("MongoDB update error:", err);
      return new NextResponse(
        JSON.stringify({ message: "Error updating user profile" }),
        { status: 500 }
      );
    }

    if (!updatedUser) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new NextResponse(
      JSON.stringify({ message: "User updated successfully", updatedUser }),
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH route error:", err);
    return new NextResponse(
      JSON.stringify({ message: "Unexpected server error" }),
      { status: 500 }
    );
  }
};
