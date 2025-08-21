// app/api/auth/facebook/deauth/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

// Verify Facebook signed_request using your App Secret
function parseSignedRequest(signedRequest, appSecret) {
  const [sigB64, payloadB64] = signedRequest.split(".");
  if (!sigB64 || !payloadB64) throw new Error("Malformed signed_request");

  // base64url -> base64
  const toBase64 = (s) => s.replace(/-/g, "+").replace(/_/g, "/");
  const sig = toBase64(sigB64);
  const payload = toBase64(payloadB64);

  // Expected HMAC-SHA256
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  if (sigB64 !== expected) throw new Error("Bad signature");

  const json = Buffer.from(payload, "base64").toString("utf8");
  return JSON.parse(json);
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const signed = form.get("signed_request");
    if (!signed) {
      return NextResponse.json(
        { error: "missing signed_request" },
        { status: 400 }
      );
    }

    const data = parseSignedRequest(signed, process.env.FACEBOOK_CLIENT_SECRET);
    // data contains e.g. { user_id, issued_at, ... }
    const facebookId = data?.user_id;
    if (!facebookId) {
      return NextResponse.json({ error: "missing user_id" }, { status: 400 });
    }

    await connectDB();

    // Your policy: unlink or delete. Here we unlink the Facebook identity.
    await User.updateOne(
      { facebookId },
      { $set: { provider: null }, $unset: { facebookId: "", avatarType: "" } }
    );

    // Facebook expects 200 OK. You can also return a JSON body.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Facebook deauth error:", err?.message || err);
    return NextResponse.json({ error: "deauth_failed" }, { status: 400 });
  }
}
