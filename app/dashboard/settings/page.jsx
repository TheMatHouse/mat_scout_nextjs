"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardSettings from "@/components/dashboard/DashboardSettings";
import { useUser } from "@/context/UserContext";

export default function SettingsPage() {
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
    return <div>Loading...</div>; // Or your preferred spinner
  }

  if (!user) {
    return null; // User is unauthenticated — useEffect will redirect
  }

  return (
    <DashboardSettings
      user={user}
      refreshUser={refreshUser}
    />
  );
}
