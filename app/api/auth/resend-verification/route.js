import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import sendVerificationEmail from "@/lib/email/sendVerificationEmail";
import { getCurrentUserFromCookies } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET || "your-default-dev-secret";

export async function POST() {
  try {
    await connectDB();

    const user = await getCurrentUserFromCookies();

    if (!user || !user.email || user.verified) {
      return NextResponse.json(
        { message: "Unauthorized or already verified" },
        { status: 400 }
      );
    }

    const verificationToken = jwt.sign({ email: user.email }, JWT_SECRET, {
      expiresIn: "1d",
    });

    await sendVerificationEmail({
      to: user.email,
      token: verificationToken,
    });

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
