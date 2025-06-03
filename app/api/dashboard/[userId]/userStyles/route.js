import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import UserStyle from "@/models/userStyleModel";
import User from "@/models/userModel";
import Style from "@/models/styleModel";
import mongoSanitize from "express-mongo-sanitize";

export async function GET(request, { params }) {
  await connectDB();
  const { userId } = params;
  const styles = await UserStyle.find({ userId });
  return new Response(JSON.stringify(styles), { status: 200 });
}

export async function POST(request, { params }) {
  try {
    await connectDB();

    const { userId } = params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Missing or invalid user ID" },
        { status: 400 }
      );
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      styleName,
      rank,
      promotionDate,
      division,
      weightClass,
      grip,
      favoriteTechnique,
    } = mongoSanitize.sanitize(requestBody);

    if (!styleName) {
      return NextResponse.json(
        { message: "Style name is required." },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const style = await Style.findOne({ styleName });
    if (!style) {
      return NextResponse.json({ message: "Style not found" }, { status: 404 });
    }

    const existing = await UserStyle.findOne({ userId, styleName });
    if (existing) {
      return NextResponse.json(
        {
          message:
            "You already have this style. Edit it or delete it before adding again.",
        },
        { status: 409 }
      );
    }

    const newStyle = await UserStyle.create({
      userId,
      styleName,
      rank,
      promotionDate: promotionDate ? new Date(promotionDate) : undefined,
      division,
      weightClass,
      grip,
      favoriteTechnique,
    });

    return NextResponse.json(
      { message: "Style saved", data: newStyle },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
