import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserStyle from "@/models/userStyleModel";
import Style from "@/models/styleModel";
import { Types } from "mongoose";
import mongoSanitize from "express-mongo-sanitize";

export async function POST(request, context) {
  try {
    await connectDB();
    const { userId } = await context.params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      styleName,
      rank,
      promotionDate,
      division,
      weightClass,
      grip,
      favoriteTechnique,
    } = mongoSanitize.sanitize(body);

    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const existing = await UserStyle.findOne({ userId, styleName });
    if (existing) {
      return NextResponse.json(
        { message: "Style already added" },
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

    // Ensure the field exists before pushing
    if (!Array.isArray(user.userStyles)) user.userStyles = [];
    user.userStyles.push(newStyle._id);
    await user.save();

    return NextResponse.json(
      { message: "Style saved", data: newStyle },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST Error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  console.log("route hit!!!");
  try {
    await connectDB();
    const { userId } = await context.params;

    const user = await User.findById(userId).populate("userStyles");
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json(user.userStyles, { status: 200 });
  } catch (err) {
    console.error("GET Error:", err);
    return NextResponse.json(
      { message: "Error fetching styles" },
      { status: 500 }
    );
  }
}
