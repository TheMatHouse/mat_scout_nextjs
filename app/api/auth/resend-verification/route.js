// app/api/auth/resend-verification/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { sendWelcomeAndVerifyEmail } from "@/lib/email/sendVerificationEmail";

const JWT_SECRET = process.env.JWT_SECRET;
const PUBLIC_DOMAIN =
  process.env.NEXT_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL;

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

    // Fresh 1-day token
    const token = jwt.sign(
      { sub: user._id?.toString?.(), email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const verifyUrl = `${PUBLIC_DOMAIN}/verify?token=${encodeURIComponent(
      token
    )}`;

    // Reuse the same Welcome+Verify helper (transactional/always sends)
    await sendWelcomeAndVerifyEmail({ toUser: user, verifyUrl });

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("❌ Resend verification error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
