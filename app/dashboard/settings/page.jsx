"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardSettings from "@/components/dashboard/DashboardSettings";
import { useUser } from "@/context/UserContext";

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
    <DashboardSettings
      user={user}
      refreshUser={refreshUser}
    />
  );
}
