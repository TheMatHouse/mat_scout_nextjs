"use server";
import { NextResponse } from "next/server";
import { connect, Types } from "mongoose";
import { connectDB } from "@/config/mongo";
import { MatchReport } from "@/models/matchReportModel";
import { User } from "@/models/userModel";

export async function GET(request, { params }) {
  try {
    const { userId } = await params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const matchReports = await MatchReport.find();

    if (!matchReports) {
      return new NextResponse(
        JSON.stringify({ message: "No match reports found" }),
        { status: 404 }
      );
    }

    return new NextResponse(JSON.stringify({ matchReports }), { status: 200 });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error getting match reports" + error.message,
      }),
      { status: 500 }
    );
  }
}
