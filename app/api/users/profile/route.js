import { auth } from "@/auth";
import { connectDB } from "@/config/mongo";
import { NextResponse } from "next/server";
import { User } from "@/models/userModel";

export const GET = async (request, { params }) => {
  const username = (await params).username;
  console.log(username);
  // try {
  //   console.log(username);
  //   await connectDB();
  //   const profile = await User.aggregate([
  //     { $match: { username: .username } },
  //     {
  //       $lookup: {
  //         from: "userstyles",
  //         localField: "_id",
  //         foreignField: "userId",
  //         as: "userStyles",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "teams",
  //         localField: "_id",
  //         foreignField: "user",
  //         as: "teams",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "teammembers",
  //         localField: "_id",
  //         foreignField: "userId",
  //         as: "teamMembers",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "scoutingreports",
  //         localField: "_id",
  //         foreignField: "athletes",
  //         pipeline: [
  //           {
  //             $lookup: {
  //               from: "videos",
  //               localField: "_id",
  //               foreignField: "report",
  //               as: "videos",
  //             },
  //           },
  //         ],
  //         as: "scoutingReports",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "scoutingreports",
  //         localField: "_id",
  //         foreignField: "access",
  //         pipeline: [
  //           {
  //             $lookup: {
  //               from: "users",
  //               localField: "athletes",
  //               foreignField: "_id",
  //               as: "shareAthletes",
  //             },
  //           },
  //           {
  //             $lookup: {
  //               from: "familymembers",
  //               localField: "familyMembers",
  //               foreignField: "_id",
  //               pipeline: [
  //                 {
  //                   $lookup: {
  //                     from: "users",
  //                     localField: "userId",
  //                     foreignField: "_id",
  //                     as: "guardian",
  //                   },
  //                 },
  //               ],
  //               as: "shareFamilyMembers",
  //             },
  //           },
  //         ],
  //         as: "scoutingReportsSharedWithMe",
  //       },
  //     },

  //     {
  //       $lookup: {
  //         from: "matchreports",
  //         localField: "_id",
  //         foreignField: "athlete",
  //         as: "matchReports",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "familymembers",
  //         localField: "_id",
  //         foreignField: "userId",
  //         pipeline: [
  //           {
  //             $lookup: {
  //               from: "matchreports",
  //               localField: "_id",
  //               foreignField: "athlete",
  //               as: "familyMatchReports",
  //             },
  //           },
  //           {
  //             $lookup: {
  //               from: "scoutingreports",
  //               localField: "_id",
  //               foreignField: "familyMembers",
  //               as: "familyScoutingReports",
  //             },
  //           },
  //           {
  //             $lookup: {
  //               from: "teammembers",
  //               localField: "_id",
  //               foreignField: "familyMemberId",
  //               as: "familyTeamMembers",
  //             },
  //           },
  //         ],
  //         as: "familyMembers",
  //       },
  //     },
  //     {
  //       $project: {
  //         tokens: 0,
  //         "userStyle._id": 0,
  //         "userInfo.email": 0,
  //         "userInfo.tokens": 0,
  //         //athlete: 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.password": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.tokens": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.avatar": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.avatarType": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.isAdmin": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.verified": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.updatedAt": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.createdAt": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.city": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.state": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.country": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian._id": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.email": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.lastLogin": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.gender": 0,
  //         "scoutingReportsSharedWithMe.shareFamilyMembers.guardian.allowPublic": 0,
  //         password: 0,
  //       },
  //     },
  //   ]);

  //   return new Response(profile, { status: 200 });
  // } catch (error) {
  //   console.error(error);
  //   return new NextResponse(error.message, {
  //     status: 500,
  //   });
  // }
};
