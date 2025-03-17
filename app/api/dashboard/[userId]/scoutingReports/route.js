"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/config/mongo";
import ScoutingReport from "@/models/scoutingReportModal";
import User from "@/models/userModel";
import Technique from "@/models/techniquesModel";
import Video from "@/models/videoModel";

export async function POST(request, { params }) {
  try {
    const { userId } = await params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    if (!request.body) {
      return new NextResponse(
        JSON.stringify({ message: "Empty request body" }),
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      athlete,
      type,
      team,
      reportForAthleteFirstName,
      athleteEmail,
      createdBy,
      createdByName,
      matchType,
      division,
      weightCategory,
      athleteFirstName,
      athleteLastName,
      athleteNationalRank,
      athleteWorldRank,
      athleteClub,
      athleteCountry,
      athleteRank,
      athleteGrip,
      athleteAttacks,
      athleteAttackNotes,
      videos,
    } = body;

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    athleteAttacks &&
      // map through athleteAttacks array and check if each attack
      // is in the techniques table
      athleteAttacks.map((attack) => {
        const existsAthlete = async () => {
          const attackExists = await Technique.findOne({
            techniqueName: attack,
          });
          if (!attackExists) {
            const newAthleteAttack = await Technique.create({
              techniqueName: attack,
            });

            const addedAthleteAttack = await newAthleteAttack.save();
          }
        };
        existsAthlete();
      });

    const athletes = [];
    const familyMembers = [];
    if (type === "user") {
      athletes.push(athlete);
    } else if (type === "familyMember") {
      familyMembers.push(athlete);
    }

    const newScoutingReport = await ScoutingReport.create({
      athletes,
      type,
      team,
      athleteEmail,
      createdBy,
      createdByName,
      matchType,
      division,
      weightCategory,
      athleteFirstName,
      athleteLastName,
      athleteNationalRank,
      athleteWorldRank,
      athleteClub,
      athleteCountry,
      athleteRank,
      athleteGrip,
      athleteAttacks,
      athleteAttackNotes,
    });

    videos &&
      videos.map(async (video) => {
        let myVideo = await Video.create({
          videoTitle: video.videoTitle,
          videoURL: video.videoURL,
          videoNotes: video.videoNotes,
          report: newScoutingReport._id,
        });
        const createdVideo = await myVideo.save();
      });

    // if (team) {
    //   const teamInfo = await Team.findById(team);

    //   const notification = await Notification.create({
    //     user: athlete,
    //     notificationType: "New Scouting Report",
    //     notificationBody: `You have a new Scouting Report from ${req.user.firstName} ${req.user.lastName} at ${teamInfo.teamName}.`,
    //     notificationLink: "/",
    //   });

    //   if (teamInfo) {
    //     sendNewScoutReportEmail(
    //       reportForAthleteFirstName,
    //       `${req.user.firstName} ${req.user.lastName}`,
    //       teamInfo.teamName,
    //       athleteEmail
    //     );
    //   }
    // }

    if (newScoutingReport) {
      return new NextResponse(
        JSON.stringify({
          status: 201,
          message: "Scouting report created successfully",
        })
      );
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error fetching user" + error.message }),
      { status: 500 }
    );
  }
}
