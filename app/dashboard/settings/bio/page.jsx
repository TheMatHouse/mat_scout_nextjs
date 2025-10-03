// app/dashboard/settings/bio/page.jsx
"use client";

import { useUser } from "@/context/UserContext";
import Spinner from "@/components/shared/Spinner";
import UserBioSection from "@/components/dashboard/UserBioSection";

export default function BioPage() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spinner size={48} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Your Bio</h1>
      <UserBioSection />
    </div>
  );
}
