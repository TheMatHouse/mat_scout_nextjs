"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";

export default function DeleteAccount({ user }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { logout } = useUser(); // ✅ Use logout function from context

  if (!user) return null;

  const handleDelete = async () => {
    if (!user?._id) {
      toast.error("User not found.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${user._id}/delete`, {
        method: "DELETE",
        credentials: "include", // send cookies
      });

      if (res.ok) {
        toast.success("Account deleted successfully");

        // ✅ Log out user (clears context and deletes token cookie)
        await logout();

        // ✅ Redirect to home page
        router.replace("/");
      } else {
        const data = await res.json();
        toast.error(data?.message || "Failed to delete account");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting account");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 border border-red-600 rounded-lg">
      <h2 className="text-xl font-bold mb-2 text-red-600">Danger Zone</h2>
      <p className="text-gray-300 mb-4">
        Deleting your account will remove all your data, including match
        reports, scouting reports, family members, notifications, and cannot be
        undone.
      </p>

      <AlertDialog
        open={open}
        onOpenChange={setOpen}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Delete Account</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent. Your account and all associated data
              will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Deleting..." : "Yes, Delete My Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
