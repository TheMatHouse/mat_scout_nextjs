// app/api/auth/forgot-password/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import crypto from "crypto";

// ✅ import the default Mail object (matches `export default Mail` in lib/email/mailer.js)
import Mail from "@/lib/email/mailer";
import { buildPasswordResetEmail } from "@/lib/email/templates/passwordReset";

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
    const normalized = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalized });

    // Always return 200 to avoid user enumeration
    if (!user) {
      return NextResponse.json(
        {
          message:
            "If the email is associated with an account, a reset link has been sent.",
        },
        { status: 200 }
      );
    }

    // Generate token + 30-minute expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    // Build HTML + send (transactional -> bypasses prefs/dedupe in your Mail policy)
    const html = buildPasswordResetEmail({ token: resetToken });
    await Mail.sendPasswordReset(user, { html });

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
