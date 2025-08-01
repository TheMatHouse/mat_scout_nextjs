"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

export default function DeleteTeamSection({ teamSlug, teamName }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
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

      // Give a short delay so toast can show before redirect
      setTimeout(() => {
        router.push("/teams");
      }, 1200);
    } catch (err) {
      console.error("Delete team error:", err);
      toast.error("Something went wrong while deleting the team.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-12 border border-red-500 rounded-md p-6 bg-red-50 dark:bg-red-900">
      <h3 className="text-lg font-semibold text-red-600 dark:text-red-300 mb-2">
        Danger Zone
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
        Deleting this team will remove all members, scouting reports, and cannot
        be undone.
      </p>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md font-semibold transition"
      >
        Delete Team
      </button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Confirm Deletion
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Are you sure you want to delete{" "}
                <span className="font-bold">{teamName}</span>? This action
                cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-1 text-white bg-red-600 hover:bg-red-700 rounded-md font-semibold disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
