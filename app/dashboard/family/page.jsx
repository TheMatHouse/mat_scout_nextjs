"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FamilyDashboard from "@/components/dashboard/family/FamilyDashboard";
import { useUser } from "@/context/UserContext";

export default function FamilyPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Family Members</h1>
      <FamilyDashboard
        user={user}
        refreshUser={refreshUser}
      />
    </div>
  );
}
