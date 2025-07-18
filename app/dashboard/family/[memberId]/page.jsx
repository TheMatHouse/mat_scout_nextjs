"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import FamilyMemberDashboard from "@/components/dashboard/family/FamilyMemberDashboard";
import { apiFetch } from "@/lib/apiClient";

export default function FamilyMemberPage({ params }) {
  const { memberId } = use(params);

  const router = useRouter();
  const { user, loading } = useUser();
  const [member, setMember] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFamilyMember = async () => {
      try {
        const res = await apiFetch(
          `/api/dashboard/${user._id}/family/${memberId}`
        );
        if (res.userId !== user._id) {
          setError("You are not authorized to access this family member.");
          return;
        }
        setMember(res);
      } catch (err) {
        console.error("Error fetching family member:", err);
        setError("Family member not found.");
      }
    };

    if (!loading && user) {
      fetchFamilyMember();
    }
  }, [loading, user, memberId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
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
