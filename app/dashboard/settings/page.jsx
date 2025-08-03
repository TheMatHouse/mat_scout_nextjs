"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardSettings from "@/components/dashboard/DashboardSettings";
import NotificationSettings from "@/components/dashboard/NotificationSettings";
import { useUser } from "@/context/UserContext";
import DeleteAccount from "@/components/dashboard/DeleteAccount";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useUser();
  const hasRefreshed = useRef(false);

  useEffect(() => {
    if (!loading && user && !user.verified && !hasRefreshed.current) {
      hasRefreshed.current = true;
      refreshUser();
    }
  }, [loading, user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      {/* Account Settings */}
      <DashboardSettings
        user={user}
        refreshUser={refreshUser}
      />

      {/* Notification Settings */}
      <NotificationSettings
        user={user}
        refreshUser={refreshUser}
      />

      {/* Delete Account */}
      <DeleteAccount user={user} />
    </div>
  );
}
