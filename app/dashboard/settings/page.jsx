"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/context/UserContext";
import DashboardSettings from "@/components/dashboard/DashboardSettings";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useCurrentUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user]);

  if (loading || !user) return null;

  return (
    <DashboardSettings
      user={user}
      refreshUser={refreshUser}
    />
  );
}
