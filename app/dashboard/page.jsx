"use client";
export const dynamic = "force-dynamic";

import { useUser } from "@/context/UserContext";
import Link from "next/link";
import { CalendarPlus, Binoculars, UserCog, Users } from "lucide-react";
import Spinner from "@/components/shared/Spinner";

export default function DashboardHome() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Loading your dashboard...
        </p>
      </div>
    );
  }
  if (!user) return null; // middleware will redirect

  const matchCount = user.matchReports ? user.matchReports.length : 0;
  const scoutingCount = user.scoutingReports ? user.scoutingReports.length : 0;
  const teamCount = user.teams ? user.teams.length : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-ms-blue to-ms-dark-red rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-4xl font-bold mb-2">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-lg mb-6">
          Track your matches, scout opponents, and manage your teams—all in one
          place.
        </p>
        <Link
          href="/dashboard/matches"
          className="inline-block bg-white text-ms-blue font-semibold px-6 py-3 rounded-lg shadow hover:bg-gray-100 transition"
        >
          + Log a Match
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Match Reports"
          value={matchCount}
          icon={<CalendarPlus className="w-6 h-6 text-ms-blue" />}
        />
        <StatCard
          title="Scouting Reports"
          value={scoutingCount}
          icon={<Binoculars className="w-6 h-6 text-ms-blue" />}
        />
        <StatCard
          title="Teams"
          value={teamCount}
          icon={<Users className="w-6 h-6 text-ms-blue" />}
        />
      </div>

      {/* What's Next Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          What's Next?
        </h2>
        <p className="text-gray-700 dark:text-gray-200 mb-4">
          Here are a few things you can do to get started:
        </p>
        <ul className="list-disc list-inside text-gray-800 dark:text-gray-200 space-y-1">
          <li>
            <Link
              href="/dashboard/matches"
              className="text-ms-blue dark:text-ms-light-gray hover:text-ms-dark-red"
            >
              Log your first match report
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/scouting"
              className="text-ms-blue dark:text-ms-light-gray hover:text-ms-dark-red"
            >
              Create a scouting report
            </Link>
          </li>
          <li>
            <Link
              href="/teams"
              className="text-ms-blue dark:text-ms-light-gray hover:text-ms-dark-red"
            >
              Join or create a team
            </Link>
          </li>
        </ul>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <DashboardCard
          href="/dashboard/matches"
          icon={
            <CalendarPlus className="w-8 h-8 text-ms-blue group-hover:scale-110 transition" />
          }
          title="Match Reports"
          description="Log your past matches and track your improvement over time."
        />
        <DashboardCard
          href="/dashboard/scouting"
          icon={
            <Binoculars className="w-8 h-8 text-ms-blue group-hover:scale-110 transition" />
          }
          title="Scouting Reports"
          description="Prepare for matchups by scouting athletes and analyzing styles."
        />
        <DashboardCard
          href="/dashboard/settings"
          icon={
            <UserCog className="w-8 h-8 text-ms-blue group-hover:scale-110 transition" />
          }
          title="Profile & Settings"
          description="Customize your profile, update preferences, and manage your account."
        />
      </div>
    </div>
  );
}

// ✅ Stat Card Component
function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-200">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </h3>
      </div>
      {icon}
    </div>
  );
}

// ✅ Dashboard Card Component
function DashboardCard({ href, icon, title, description }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white dark:bg-gray-900 shadow-md p-6 hover:shadow-lg transition border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-4 mb-4">
        {icon}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
        {description}
      </p>
    </Link>
  );
}
