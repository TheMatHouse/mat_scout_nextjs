// app/api/teams/[slug]/upload-logo/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import cloudinary from "@/lib/cloudinary";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req, { params }) {
  try {
    await connectDB();

    const slug = params.slug;
    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("image"); // <input name="image" type="file" />
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type (jpeg/png/webp only)" },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { message: "File too large (max 5MB)" },
        { status: 413 }
      );
    }

    // Delete previous uploaded logo if present
    if (team.logoType === "uploaded" && team.logoId) {
      try {
        await cloudinary.uploader.destroy(team.logoId);
      } catch (err) {
        console.warn("Error deleting previous team logo:", err);
      }
    }

    // Convert to data URL (works well with cloudinary.uploader.upload)
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const folder =
      process.env.NODE_ENV === "production"
        ? "prod/team-logos"
        : "staging/team-logos";

    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      public_id: `team_${team._id}_${Date.now()}`,
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      unique_filename: true,
      overwrite: false,
      // soft cap to keep logos reasonable; delivery can further resize via URL
      transformation: [{ width: 800, height: 800, crop: "limit" }],
    });

    // Update team doc
    team.logoURL = result.secure_url; // keep the original secure URL in DB
    team.logoId = result.public_id;
    team.logoType = "uploaded";
    await team.save();

    // Provide fast-delivery URL for immediate UI use
    const displayUrl = result.secure_url.replace(
      "/upload/",
      "/upload/f_auto,q_auto/"
    );

    return NextResponse.json(
      {
        ok: true,
        message: "Logo updated",
        url: result.secure_url,
        displayUrl,
        publicId: result.public_id,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Upload logo error:", err);
    return NextResponse.json(
      { message: "Upload error: " + err.message },
      { status: 500 }
    );
  }
}
