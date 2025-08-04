"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FamilyDashboard from "@/components/dashboard/family/FamilyDashboard";
import { useUser } from "@/context/UserContext";
import Spinner from "@/components/shared/Spinner";

export default function FamilyPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spinner size={48} />
      </div>
    );
  }
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
