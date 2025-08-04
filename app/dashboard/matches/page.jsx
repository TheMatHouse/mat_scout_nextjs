"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardMatches from "@/components/dashboard/DashboardMatches";
import { useUser } from "@/context/UserContext";
import Spinner from "@/components/shared/Spinner";

export default function MatchesPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useUser();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/");
      }
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Loading your match reports...
        </p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <DashboardMatches
      user={user}
      refreshUser={refreshUser}
    />
  );
}
