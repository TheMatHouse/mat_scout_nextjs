/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Team from "@/models/teamModel";

export const runtime = "edge";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "user" | "family" | "team"
  const username = searchParams.get("username");
  const slug = searchParams.get("slug");

  await connectDB();

  let title = "MatScout";
  let image = `${process.env.NEXT_PUBLIC_DOMAIN}/default-og.png`;
  let alt = "MatScout Default";

  if (type === "user" && username) {
    const user = await User.findOne({ username });
    if (user && user.allowPublic) {
      title = `${user.firstName} ${user.lastName} | MatScout`;
      image =
        user.avatar || `${process.env.NEXT_PUBLIC_DOMAIN}/default-avatar.png`;
      alt = `User avatar for ${username}`;
    }
  }

  if (type === "family" && username) {
    const familyMember = await User.findOne({ username }); // Adjust if you have a separate Family model
    if (familyMember && familyMember.allowPublic) {
      title = `${familyMember.firstName} ${familyMember.lastName} | Family Profile`;
      image =
        familyMember.avatar ||
        `${process.env.NEXT_PUBLIC_DOMAIN}/default-avatar.png`;
      alt = `Family member avatar for ${username}`;
    }
  }

  if (type === "team" && slug) {
    const team = await Team.findOne({ teamSlug: slug });
    if (team) {
      title = `${team.teamName} | Team Profile`;
      image =
        team.logoURL || `${process.env.NEXT_PUBLIC_DOMAIN}/default-team.png`;
      alt = `Team logo for ${team.teamName}`;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#1a1a1a",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <img
          src={image}
          alt={alt}
          width={160}
          height={160}
          style={{ borderRadius: "50%", marginBottom: "20px" }}
        />
        <h1 style={{ fontSize: 48, fontWeight: "bold", textAlign: "center" }}>
          {title}
        </h1>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
