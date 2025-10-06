// app/[username]/page.jsx
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserStyle from "@/models/userStyleModel";
import "@/models/matchReportModel";

import UserProfileClient from "@/components/profile/UserProfileClient";

function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function plainifyStyles(docs = []) {
  return (docs || []).map((s) => ({
    id: String(s._id),
    styleName: s.styleName ?? "",
    currentRank: s.currentRank ?? "",
    startDate: s.startDate ? new Date(s.startDate).toISOString() : null,
    grip: s.grip ?? "",
    favoriteTechnique: s.favoriteTechnique ?? "",
    promotions: Array.isArray(s.promotions)
      ? s.promotions.map((p) => ({
          rank: p?.rank ?? "",
          promotedOn: p?.promotedOn
            ? new Date(p.promotedOn).toISOString()
            : null,
          awardedBy: p?.awardedBy ?? "",
          note: p?.note ?? "",
          proofUrl: p?.proofUrl ?? "",
        }))
      : [],
    createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
    updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
  }));
}

export async function generateMetadata({ params }) {
  const { username } = params;
  await connectDB();

  const member = await User.findOne({
    username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
  }).lean();

  if (!member) {
    return {
      title: "Profile Not Found | MatScout",
      description: "The profile you are looking for does not exist.",
    };
  }

  const title =
    `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
    member.username;
  const description = `View ${
    member.firstName || member.username
  }'s grappling profile on MatScout.`;

  return { title: `${title} | MatScout`, description };
}

export default async function UserProfilePage({ params }) {
  const { username } = params;
  await connectDB();

  const user = await User.findOne(
    { username: { $regex: `^${escapeRegex(username)}$`, $options: "i" } },
    { _id: 1, username: 1, firstName: 1, lastName: 1, allowPublic: 1 }
  ).lean();

  if (!user) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let isMyProfile = false;
  if (token) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      if (payload?.userId === String(user._id)) {
        isMyProfile = true;
      }
    } catch {}
  }

  const isPublic =
    user.allowPublic === true || user.allowPublic === "Public" ? true : false;

  if (!isMyProfile && !isPublic) {
    return (
      <div className="w-full flex justify-center py-20">
        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-200">
          This profile is private.
        </h1>
      </div>
    );
  }

  const stylesRaw = await UserStyle.find(
    { userId: user._id, familyMemberId: null },
    {
      styleName: 1,
      currentRank: 1,
      promotions: 1,
      startDate: 1,
      grip: 1,
      favoriteTechnique: 1,
      createdAt: 1,
      updatedAt: 1,
    }
  )
    .sort({ createdAt: 1 })
    .lean();

  const styles = plainifyStyles(stylesRaw);

  return (
    <UserProfileClient
      username={user.username}
      isMyProfile={isMyProfile}
      userId={String(user._id)}
      initialStyles={styles}
    />
  );
}
