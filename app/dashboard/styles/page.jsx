"use client";

import React, { useEffect } from "react";
import DashboardStyles from "@/components/dashboard/DashboardStyles";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import Spinner from "@/components/shared/Spinner";

export default function DashboardStylesPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Loading your styles...
        </p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="p-4">
      <DashboardStyles
        user={user}
        userType="user"
      />
    </div>
  );
}
