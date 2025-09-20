"use client";
export const dynamic = "force-dynamic";

import { useMemo } from "react";
import DashboardMatches from "@/components/dashboard/DashboardMatches";
import { useUser } from "@/context/UserContext";
import Spinner from "@/components/shared/Spinner";
import Link from "next/link";

export default function MatchesPage() {
  const userCtx = useUser();
  const user = userCtx?.user;
  const loading = userCtx?.loading;
  const refreshUser = userCtx?.refreshUser;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-500 dark:text-gray-300 mt-2 text-lg">
          Loading your match reports...
        </p>
      </div>
    );
  }

  // No auto-redirect; just show a gentle prompt
  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Please sign in</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You need an account to view Match Reports.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center rounded-md border px-4 py-2 hover:bg-accent transition"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <DashboardMatches
      user={user}
      refreshUser={refreshUser}
    />
  );
}
