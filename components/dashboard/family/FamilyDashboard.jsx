// components/dashboard/FamilyDashboard.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import ModalLayout from "@/components/shared/ModalLayout";
import AddFamilyForm from "./forms/FamilyMemberForm";
import FamilyCard from "./FamilyCard";
import { useUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/apiClient";

function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-700 bg-slate-800/80 dark:bg-slate-900/80 shadow-xl animate-pulse h-56"
        />
      ))}
    </div>
  );
}

const FamilyDashboard = () => {
  const { user } = useUser();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const coerceMembers = useCallback((res) => {
    // Accept several response shapes:
    // 1) Array
    if (Array.isArray(res)) return res;

    // 2) { ok, rows: [...] }
    if (res && Array.isArray(res.rows)) return res.rows;

    // 3) { ok, members: [...] }
    if (res && Array.isArray(res.members)) return res.members;

    // 4) { data: [...] }
    if (res && Array.isArray(res.data)) return res.data;

    // 5) { results: [...] }
    if (res && Array.isArray(res.results)) return res.results;

    return [];
  }, []);

  const fetchFamilyMembers = useCallback(async () => {
    if (!user?._id) {
      setFamilyMembers([]);
      setLoadingMembers(false);
      return;
    }
    try {
      setLoadingMembers(true);
      const res = await apiFetch(`/api/dashboard/${user._id}/family`, {
        cache: "no-store",
      });
      const members = coerceMembers(res);
      setFamilyMembers(members);
    } catch (error) {
      console.error("Failed to fetch family members", error);
      setFamilyMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [user?._id, coerceMembers]);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const handleDelete = (deletedId) => {
    setFamilyMembers((prev) => prev.filter((m) => m._id !== deletedId));
  };

  const isLoading = loadingMembers;

  return (
    <div className="px-4 md:px-6 lg:px-8">
      {/* Header + Add Button */}
      <div className="flex flex-col items-start mb-4">
        <h1 className="text-2xl font-bold mb-4">My Family Members</h1>
        <Button
          className="btn btn-primary"
          onClick={() => setOpen(true)}
        >
          Add Family Member
        </Button>
      </div>

      {/* Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add Family Member"
        description="Add a new family member to your profile. You can manage their styles, matches, and more later."
        withCard={true}
      >
        <AddFamilyForm
          user={user}
          onClose={() => setOpen(false)}
          onSuccess={fetchFamilyMembers}
        />
      </ModalLayout>

      <hr className="border-gray-200 dark:border-gray-700 my-4" />

      {/* Loading / Empty / Cards */}
      {isLoading ? (
        <SkeletonGrid />
      ) : familyMembers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <p className="text-sm">
            No family members yet. Click “Add Family Member” to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
          {familyMembers.map((member) => (
            <FamilyCard
              key={member._id}
              member={member}
              userId={user._id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FamilyDashboard;
