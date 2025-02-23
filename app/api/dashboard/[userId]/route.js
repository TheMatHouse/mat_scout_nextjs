"use server";
import { NextResponse } from "next/server";
import User from "@/models/userModel";
import { Types } from "mongoose";
import { ObjectId } from "mongodb";
import { connectDB } from "@/config/mongo";
import { revalidatePath } from "next/cache";

export async function GET(request, { params }) {
  const { userId } = await params;
  //console.log(typeof userId);

  const mongoId = ObjectId.createFromHexString(userId);

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    await connectDB();
    //const user = await User.findById({ _id: userId });
    const user = await User.aggregate([
      { $match: { _id: ObjectId.createFromHexString(userId) } },
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
          "userStyle._id": 0,
          "userInfo.email": 0,
          "userInfo.tokens": 0,
          //athlete: 0,
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
          password: 0,
        },
      },
    ]);

    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new NextResponse(JSON.stringify({ user }));
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error fetching user" + error.message }),
      { status: 500 }
    );
  }
}

export const PATCH = async (request, { params }) => {
  try {
    const { userId } = await params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      city,
      state,
      country,
      gender,
      allowPublic,
    } = body;

    await connectDB();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, email, city, state, country, gender, allowPublic },
      { new: true }
    );
    if (!updatedUser) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    } else {
      revalidatePath("/");
      return new NextResponse(
        JSON.stringify({ message: "User updated successfully", updatedUser }),
        { status: 200 }
      );
    }

    return new NextResponse(JSON.stringify({ message: "testing" }));
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error fetching user" + error.message }),
      { status: 500 }
    );
  }
};
