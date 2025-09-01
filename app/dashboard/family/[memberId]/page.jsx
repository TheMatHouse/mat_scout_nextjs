// app/dashboard/family/[memberId]/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import FamilyMemberDashboard from "@/components/dashboard/family/FamilyMemberDashboard";
import Spinner from "@/components/shared/Spinner";

export default function FamilyMemberPage() {
  const { memberId } = useParams(); // ✅ use Next hook
  const { user, loading } = useUser();

  const [member, setMember] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user?._id || !memberId) return;

    const fetchFamilyMember = async () => {
      try {
        const res = await fetch(
          `/api/dashboard/${user._id}/family/${memberId}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err?.error || "Family member not found.");
          setMember(null);
          return;
        }

        const data = await res.json();
        if (String(data?.userId) !== String(user._id)) {
          setError("You are not authorized to access this family member.");
          setMember(null);
          return;
        }

        setError("");
        setMember(data);
      } catch (e) {
        console.error("Error fetching family member:", e);
        setError("Family member not found.");
        setMember(null);
      }
    };

    fetchFamilyMember();
  }, [loading, user?._id, memberId]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!member) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        {member.firstName} {member.lastName}'s Dashboard
      </h1>
      <FamilyMemberDashboard member={member} />
    </div>
  );
}
