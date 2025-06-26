"use client";

import { useUser } from "@/context/UserContext";
import Link from "next/link";

export default function DashboardHome() {
  const { user, loading } = useUser();

  if (loading) return <div className="p-4">Loading...</div>;
  if (!user) return <div className="p-4">Unauthorized</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">
        Welcome back, {user.firstName}!
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl p-4 text-center shadow bg-white text-black dark:bg-gray-800 dark:text-white">
          <p className="text-sm text-gray-500 dark:text-gray-400">Matches</p>
          <p className="text-2xl font-semibold">3</p>
        </div>
        <div className="rounded-xl p-4 text-center shadow bg-white text-black dark:bg-gray-800 dark:text-white">
          <p className="text-sm text-gray-500 dark:text-gray-400">Reports</p>
          <p className="text-2xl font-semibold">2</p>
        </div>
        <div className="rounded-xl p-4 text-center shadow bg-white text-black dark:bg-gray-800 dark:text-white">
          <p className="text-sm text-gray-500 dark:text-gray-400">Teams</p>
          <p className="text-2xl font-semibold">1</p>
        </div>
        <div className="rounded-xl p-4 text-center shadow bg-white text-black dark:bg-gray-800 dark:text-white">
          <p className="text-sm text-gray-500 dark:text-gray-400">Sports</p>
          <p className="text-2xl font-semibold">2</p>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="flex flex-wrap gap-4">
        <Link
          href="/match/new"
          className="btn"
        >
          Add Match
        </Link>
        <Link
          href="/report/new"
          className="btn"
        >
          New Report
        </Link>
        <Link
          href="/dashboard/settings"
          className="btn"
        >
          Edit Settings
        </Link>
      </div>
    </div>
  );
}
