"use client";

import React, { useEffect } from "react";
import DashboardStyles from "@/components/dashboard/DashboardStyles";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function DashboardStylesPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user)
    return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="p-4">
      <DashboardStyles
        user={user}
        userType="user"
      />
    </div>
  );
}
