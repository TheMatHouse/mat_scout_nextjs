import passport from "@/lib/passport";
import { signToken } from "@/lib/jwt";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";
import { NextResponse } from "next/server";

// Simulate Passport-like auth manually for callback
export async function GET(req) {
  try {
    await connectDB();

    // Facebook sends access token + profile via query string
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Missing Facebook code" },
        { status: 400 }
      );
    }

    // Normally Facebook redirects and Passport handles this
    // But in App Router we need to do this manually.
    // Instead of decoding code ourselves (complicated),
    // the best path is to use `next-auth` or build the flow via frontend (we’ll skip that for now)

    return NextResponse.json(
      {
        error:
          "OAuth callback hit, but Facebook auth flow must be finalized client-side or with server middleware.",
      },
      { status: 501 }
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    );
  }
}
