"use client";

import { useUser } from "@/context/UserContext";
import Link from "next/link";
import { CalendarPlus, Binoculars, UserCog } from "lucide-react";

export default function DashboardHome() {
  const { user, loading } = useUser();

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <div className="p-6">Unauthorized</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Use your dashboard to track your matches, scout future opponents, and
          manage your profile and teams.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Matches */}
        <Link
          href="/dashboard/matches"
          className="group rounded-2xl bg-white dark:bg-gray-900 shadow-md p-6 hover:shadow-lg transition border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-4 mb-4">
            <CalendarPlus className="w-8 h-8 text-ms-blue group-hover:scale-110 transition" />
            <h2 className="text-xl font-semibold">Match Reports</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            Log your past matches and track your improvement over time with
            notes, stats, and opponent info.
          </p>
        </Link>

        {/* Scouting */}
        <Link
          href="/dashboard/scouting"
          className="group rounded-2xl bg-white dark:bg-gray-900 shadow-md p-6 hover:shadow-lg transition border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-4 mb-4">
            <Binoculars className="w-8 h-8 text-ms-blue group-hover:scale-110 transition" />
            <h2 className="text-xl font-semibold">Scouting Reports</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            Prepare for future matchups by scouting athletes, analyzing
            strengths, grip styles, and favorite techniques.
          </p>
        </Link>

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          className="group rounded-2xl bg-white dark:bg-gray-900 shadow-md p-6 hover:shadow-lg transition border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-4 mb-4">
            <UserCog className="w-8 h-8 text-ms-blue group-hover:scale-110 transition" />
            <h2 className="text-xl font-semibold">Profile & Settings</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            Customize your profile with styles/sports, avatar, bio, location,
            and visibility options.
          </p>
        </Link>
      </div>
    </div>
  );
}
