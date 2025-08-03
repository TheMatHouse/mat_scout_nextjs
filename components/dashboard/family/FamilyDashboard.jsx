"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ModalLayout from "@/components/shared/ModalLayout";
import AddFamilyForm from "./forms/FamilyMemberForm";
import FamilyCard from "./FamilyCard";
import { useUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/apiClient";

const FamilyDashboard = () => {
  const { user } = useUser();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchFamilyMembers = async () => {
    try {
      const res = await apiFetch(`/api/dashboard/${user._id}/family`);
      setFamilyMembers(res);
    } catch (error) {
      console.error("Failed to fetch family members", error);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchFamilyMembers();
    }
  }, [user]);

  const handleDelete = (deletedId) => {
    setFamilyMembers((prev) => prev.filter((m) => m._id !== deletedId));
  };

  return (
    <div>
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

      {/* Modal using ModalLayout */}
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

      {/* Family Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(familyMembers) && familyMembers.length > 0 ? (
          familyMembers.map((member) => (
            <FamilyCard
              key={member._id}
              member={member}
              userId={user._id}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No family members found.
          </p>
        )}
      </div>
    </div>
  );
};

export default FamilyDashboard;
