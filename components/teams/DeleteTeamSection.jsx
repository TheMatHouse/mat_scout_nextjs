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

export default function DeleteTeamSection({ teamSlug, teamName }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!teamSlug) {
      toast.error("Team not found.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamSlug}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete team");
        setLoading(false);
        return;
      }

      toast.success(`${teamName} has been deleted successfully!`);

      // Redirect after short delay
      setTimeout(() => {
        router.push("/teams");
      }, 1200);
    } catch (err) {
      console.error("Delete team error:", err);
      toast.error("Something went wrong while deleting the team.");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 border border-red-600 rounded-lg">
      <h2 className="text-xl font-bold mb-2 text-red-600">Danger Zone</h2>
      <p className="text-gray-900 dark:text-gray-100 mb-4 text-md leading-relaxed">
        Deleting this team will remove all members, scouting reports, and cannot
        be undone.
      </p>

      <AlertDialog
        open={open}
        onOpenChange={setOpen}
      >
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="btn-delete"
          >
            Delete Team
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="alert-danger">
          <AlertDialogHeader>
            <AlertDialogTitle className="alert-title">
              ⚠ Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="alert-description">
              This will permanently delete <strong>{teamName}</strong> and all
              related data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="alert-confirm"
            >
              {loading ? "Deleting..." : "Yes, Delete Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
