import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import cloudinary from "@/lib/cloudinary";

export async function POST(req, { params }) {
  try {
    await connectDB();

    const slug = params.slug;
    const team = await Team.findOne({ teamSlug: slug });

    if (!team) {
      return new NextResponse(JSON.stringify({ message: "Team not found" }), {
        status: 404,
      });
    }

    const formData = await req.formData();
    const file = formData.get("image");

    if (!file) {
      return new NextResponse(JSON.stringify({ message: "No file uploaded" }), {
        status: 400,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    // ✅ Delete previously uploaded logo if exists
    if (team.logoType === "uploaded" && team.logoId) {
      try {
        await cloudinary.uploader.destroy(team.logoId);
        console.log("Deleted old uploaded logo:", team.logoId);
      } catch (err) {
        console.warn("Error deleting previous team logo:", err);
      }
    }

    // ✅ Upload new logo
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: "team_logos",
      public_id: `team_${team._id}_${Date.now()}`,
      transformation: [{ width: 400, height: 400, crop: "fill" }],
    });

    // ✅ Update team
    team.logoURL = result.secure_url;
    team.logoId = result.public_id;
    team.logoType = "uploaded";
    await team.save();

    return new NextResponse(
      JSON.stringify({ message: "Logo updated", url: result.secure_url }),
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error("Upload logo error:", err);
    return new NextResponse(
      JSON.stringify({ message: "Upload error: " + err.message }),
      {
        status: 500,
      }
    );
  }
}
