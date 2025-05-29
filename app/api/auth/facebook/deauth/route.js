import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

const APP_SECRET = process.env.FACEBOOK_CLIENT_SECRET;

function parseSignedRequest(signedRequest) {
  const [encodedSig, payload] = signedRequest.split(".");
  const sig = Buffer.from(encodedSig, "base64");
  const data = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));

  const expectedSig = crypto
    .createHmac("sha256", APP_SECRET)
    .update(payload)
    .digest();

  const isValid = crypto.timingSafeEqual(sig, expectedSig);

  return isValid ? data : null;
}

export async function POST(req) {
  try {
    const body = await req.formData();
    const signedRequest = body.get("signed_request");

    const data = parseSignedRequest(signedRequest);
    if (!data) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const facebookUserId = data.user_id;

    await connectDB();
    const user = await User.findOneAndUpdate(
      { facebookId: facebookUserId },
      { $set: { isDeauthorized: true } }
    );

    console.log("Facebook user deauthorized:", facebookUserId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Facebook deauth error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
