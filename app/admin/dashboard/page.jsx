import Link from "next/link";
import {
  Users,
  Shield,
  FileText,
  Settings,
  UserPlus,
  ClipboardList,
  Search,
} from "lucide-react";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import FamilyMember from "@/models/familyMemberModel";
import MatchReport from "@/models/matchReportModel";
import ScoutingReport from "@/models/scoutingReportModel";

export default async function AdminDashboardPage() {
  await connectDB();

  // Fetch counts in parallel
  const [
    userCount,
    familyCount,
    teamCount,
    matchReportCount,
    scoutingReportCount,
  ] = await Promise.all([
    User.countDocuments(),
    FamilyMember.countDocuments(),
    Team.countDocuments(),
    MatchReport.countDocuments(),
    ScoutingReport.countDocuments(),
  ]);

  const cards = [
    {
      label: "Total Users",
      value: userCount.toString(),
      icon: <Users size={24} />,
      href: "/admin/users",
    },
    {
      label: "Family Members",
      value: familyCount.toString(),
      icon: <UserPlus size={24} />,
      href: "/admin/family-members",
    },
    {
      label: "Total Teams",
      value: teamCount.toString(),
      icon: <Shield size={24} />,
      href: "/admin/teams",
    },
    {
      label: "Match Reports",
      value: matchReportCount.toString(),
      icon: <ClipboardList size={24} />,
      href: "/admin/reports/matches",
    },
    {
      label: "Scouting Reports",
      value: scoutingReportCount.toString(),
      icon: <Search size={24} />,
      href: "/admin/reports/scouting",
    },
    {
      label: "Settings",
      value: "-",
      icon: <Settings size={24} />,
      href: "/admin/settings",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Admin Dashboard
      </h1>
      <p className="mb-8 text-gray-700 dark:text-gray-300">
        Welcome to the Admin Panel. Use the cards below to manage users, family
        members, teams, and reports.
      </p>

      {/* Responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white dark:bg-gray-900 shadow hover:shadow-lg dark:hover:border dark:border-gray-700 rounded-lg p-6 flex flex-col justify-between transition h-full"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {card.icon}
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {card.label}
                </p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {card.value}
                </h2>
              </div>
            </div>
            <span className="text-ms-light-red font-medium hover:underline">
              Manage
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
