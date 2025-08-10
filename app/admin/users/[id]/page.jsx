// app/admin/users/[id]/page.jsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import TeamMember from "@/models/teamMemberModel";
import Team from "@/models/teamModel";
import AdminUserDetailClient from "@/components/admin/users/AdminUserDetailClient";

// helper: strip sensitive fields + stringify ObjectIds/Dates
function sanitizeUser(u) {
  if (!u) return null;
  const {
    password,
    resetPasswordToken,
    resetPasswordExpires,
    verificationToken,
    __v,
    ...rest
  } = u;
  return rest;
}

// helper: deep JSON trick to remove ObjectId/Date instances
function toPlain(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default async function AdminUserDetailPage({ params }) {
  await connectDB();

  const me = await getCurrentUser();
  if (!me || !me.isAdmin) {
    redirect("/");
  }

  const { id } = await params;

  // Load raw docs
  const userDoc = await User.findById(id).lean();
  if (!userDoc) {
    return <div className="p-8">User not found.</div>;
  }

  const familyDocs = await FamilyMember.find({ userId: id }).lean();
  const membershipsDocs = await TeamMember.find({ userId: id })
    .populate({ path: "teamId", model: Team, select: "teamName teamSlug" })
    .lean();

  // Build memberships
  const memberships = membershipsDocs.map((m) => ({
    _id: m._id,
    role: m.role,
    team: m.teamId
      ? { _id: m.teamId._id, name: m.teamId.teamName, slug: m.teamId.teamSlug }
      : null,
    createdAt: m.createdAt,
  }));

  // Counts
  const matchReportsCount = Array.isArray(userDoc.matchReports)
    ? userDoc.matchReports.length
    : 0;
  const scoutingReportsCount = Array.isArray(userDoc.scoutingReports)
    ? userDoc.scoutingReports.length
    : 0;

  // Sanitize
  const safeUser = sanitizeUser(userDoc);

  // Compose bundle then convert to plain JSON-safe values
  const bundle = toPlain({
    user: safeUser,
    family: familyDocs,
    memberships,
    stats: {
      matchReportsCount,
      scoutingReportsCount,
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <AdminUserDetailClient initialData={bundle} />
    </div>
  );
}
