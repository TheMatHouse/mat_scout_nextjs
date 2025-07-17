// app/api/auth/forgot-password/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel"; // adjust path if needed
import crypto from "crypto";
import { sendResetPasswordEmail } from "@/lib/email/sendResetPassEmail";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "A valid email is required." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email });

    if (!user) {
      // For security, don’t reveal user existence
      return NextResponse.json(
        {
          message:
            "If the email is associated with an account, a reset link has been sent.",
        },
        { status: 200 }
      );
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiration = Date.now() + 1000 * 60 * 30; // valid for 30 minutes

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = tokenExpiration;
    await user.save();

    await sendResetPasswordEmail({ to: email, token: resetToken });

    return NextResponse.json(
      {
        message:
          "If the email is associated with an account, a reset link has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
