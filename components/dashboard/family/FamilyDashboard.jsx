"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
      <div className="flex flex-column items-center">
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button className="ml-6 bg-gray-900 hover:bg-gray-500 border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              Add Family Member
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
              <DialogDescription>
                Add a new family member to your profile. You can manage their
                styles, matches, and more later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <AddFamilyForm
                user={user}
                onClose={() => setOpen(false)}
                onSuccess={fetchFamilyMembers}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <hr className="inline-block w-full border-t-1 border-gray-100 my-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {familyMembers.map((member) => (
          <FamilyCard
            key={member._id}
            member={member}
            userId={user._id}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default FamilyDashboard;
