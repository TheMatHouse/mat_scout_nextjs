// app/api/auth/resend-verification/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
// ⬇️ New imports
import { Mail } from "@/lib/mailer";
import { buildVerificationEmail } from "@/lib/emails/verification";

const JWT_SECRET = process.env.JWT_SECRET;
const PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN; // e.g., https://matscout.com

export async function POST() {
  try {
    await connectDB();

    // Get the currently authenticated user
    const user = await getCurrentUserFromCookies();

    // Must be logged in, have an email, and not already verified
    if (!user || !user.email || user.verified) {
      return NextResponse.json(
        { message: "Unauthorized or already verified" },
        { status: 400 }
      );
    }

    // Create a fresh verification token (JWT) with 1-day expiry
    const verificationToken = jwt.sign(
      { sub: user._id?.toString?.(), email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Build HTML (link points to your verify page with the new token)
    const html = buildVerificationEmail({
      token: verificationToken,
      url:
        PUBLIC_DOMAIN &&
        `${PUBLIC_DOMAIN}/verify?token=${encodeURIComponent(
          verificationToken
        )}`,
    });

    // 🚀 Transactional = always allowed, bypasses EmailLog + user prefs
    await Mail.sendVerification({ email: user.email }, { html });

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("❌ Resend verification error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
