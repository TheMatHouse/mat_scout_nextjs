"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import UserStyle from "@/models/userStyleModel";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Style from "@/models/styleModel";
import { sendResponse } from "@/lib/helpers/responseHelper";
import mongoSanitize from "express-mongo-sanitize";

export const GET = async (request, { params }) => {
  const { userId } = await params;
  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }
    await connectDB();
    const UserStyles = await UserStyle.find({ userId });
    if (UserStyles) {
      return new NextResponse(JSON.stringify(UserStyles), { status: 201 });
    } else {
      return new NextResponse("No styles found", { status: 404 });
    }
  } catch (error) {
    return new NextResponse("Error fetching users " + error.message, {
      status: 500,
    });
  }
};

export const POST = async (request, context) => {
  try {
    await connectDB();
    const { userId } = context.params || {};

    if (!userId) {
      return sendResponse("Missing required parameters", 400);
    }
    // Authenticate user
    const auth = getAuth(request);
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return sendResponse(
        "Unauthorized. Please sign in to perform this action.",
        401
      );
    }

    // Validate IDs
    if (!Types.ObjectId.isValid(userId)) {
      return sendResponse("Invalid or missing user ID", 400);
    }

    // Ensure request body exists
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return sendResponse("Invalid JSON format in request body", 400);
    }

    if (!requestBody || Object.keys(requestBody).length === 0) {
      return sendResponse("Empty request body", 400);
    }

    const sanitizedBody = mongoSanitize.sanitize(requestBody);

    const {
      styleName,
      rank,
      promotionDate,
      division,
      weightClass,
      grip,
      favoriteTechnique,
    } = sanitizedBody;

    const userExists = await User.findById(userId);
    if (!userExists) {
      return sendResponse("User not found", 404);
    }

    // Check to see if the style exists
    const styleExists = await Style.findOne({ styleName });

    if (!styleExists) {
      return sendResponse("Style not found", 404);
    }

    // Check to make sure this user does not already have this style
    const userStyleExists = await UserStyle.findOne({
      userId,
      styleName,
    });

    if (userStyleExists) {
      return sendResponse("You already have this style.", 404);
    }

    const newUserStyle = await UserStyle.create({
      styleName: styleName,
      rank,
      promotionDate,
      division,
      weightClass,
      grip,
      favoriteTechnique,
      userId,
    });

    return sendResponse("User style created successfully", 201);
  } catch (error) {
    return sendResponse(`Error creating user style: ${error.message}`, 500);
  }
};
