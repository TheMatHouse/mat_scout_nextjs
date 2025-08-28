// app/teams/[slug]/members/page.jsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import User from "@/models/userModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import ManagerMembersClient from "@/components/teams/ManagerMembersClient";

export default async function MembersPage({ params }) {
  const { slug } = await params; // Next 15
  await connectDB();

  const team = await Team.findOne({ teamSlug: slug })
    .select("_id teamName teamSlug")
    .lean();
  if (!team) notFound();

  const me = await getCurrentUserFromCookies().catch(() => null);
  if (!me?._id) {
    redirect(`/login?next=${encodeURIComponent(`/teams/${slug}/members`)}`);
  }

  const myLink = await TeamMember.findOne({
    teamId: team._id,
    userId: me._id,
  })
    .select("role")
    .lean();

  if (!myLink) {
    // Not a member → don’t allow roster view
    redirect(`/teams/${slug}`);
  }

  const myRole = (myLink.role || "").toLowerCase();
  const isManagerOrCoach = myRole === "manager" || myRole === "coach";

  if (isManagerOrCoach) {
    // Manager/Coach: full management UI (client)
    return <ManagerMembersClient slug={slug} />;
  }

  // Regular member: simple roster list (server-rendered)
  const links = await TeamMember.find({ teamId: team._id })
    .select("userId")
    .lean();

  const userIds = links.map((l) => l.userId).filter(Boolean);
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select("firstName lastName username avatar")
        .lean()
    : [];

  const map = new Map(users.map((u) => [String(u._id), u]));
  const rows = links
    .map((l) => {
      const u = map.get(String(l.userId));
      if (!u) return null;
      return {
        id: String(l.userId),
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        username: u.username || "",
        avatar: u.avatar || "",
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        (a.lastName || "").localeCompare(b.lastName || "") ||
        (a.firstName || "").localeCompare(b.firstName || "")
    );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Members</h2>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          No members yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3"
            >
              {m.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.avatar}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-black/10"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {m.firstName || m.lastName
                    ? `${(m.firstName || "").slice(0, 1)}${(
                        m.lastName || ""
                      ).slice(0, 1)}`
                    : (m.username || "U").slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <Link
                  href={`/family/${encodeURIComponent(m.username)}`}
                  className="block truncate font-medium hover:underline"
                >
                  {m.firstName} {m.lastName}
                  <span className="text-gray-500"> @{m.username}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
