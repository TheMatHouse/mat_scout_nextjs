"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef } from "react";
import DashboardSettings from "@/components/dashboard/DashboardSettings";
import NotificationSettings from "@/components/dashboard/NotificationSettings";
import { useUser } from "@/context/UserContext";
import DeleteAccount from "@/components/dashboard/DeleteAccount";
import Spinner from "@/components/shared/Spinner";

export default function SettingsPage() {
  const { user, loading, refreshUser } = useUser();
  const hasRefreshed = useRef(false);

  useEffect(() => {
    if (!loading && user && !user.verified && !hasRefreshed.current) {
      hasRefreshed.current = true;
      if (typeof refreshUser === "function") refreshUser();
    }
  }, [loading, user, refreshUser]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Loading your settings...
        </p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      <DashboardSettings
        user={user}
        refreshUser={refreshUser}
      />
      <NotificationSettings
        user={user}
        refreshUser={refreshUser}
      />
      <DeleteAccount user={user} />
    </div>
  );
}
