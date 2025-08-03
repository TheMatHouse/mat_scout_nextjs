"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import ModalLayout from "@/components/shared/ModalLayout";
import FormField from "@/components/shared/FormField";

export default function TeamModal({ open, setOpen, onSuccess }) {
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const router = useRouter();

  // ✅ Auto-generate slug
  useEffect(() => {
    if (!teamName.trim()) return;
    const suggested = teamName.trim().toLowerCase().replace(/\s+/g, "_");

    setTeamSlug((prevSlug) => {
      const cleanPrev = prevSlug.trim().toLowerCase().replace(/\s+/g, "_");
      const isDefault = cleanPrev === "" || suggested.startsWith(cleanPrev);
      return isDefault ? suggested : prevSlug;
    });
  }, [teamName]);

  // ✅ Check slug availability
  useEffect(() => {
    if (!teamSlug.trim() || teamSlug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const checkAvailability = async () => {
      setCheckingSlug(true);
      try {
        const res = await fetch(
          `/api/teams/check-team-slug?teamSlug=${teamSlug}`
        );
        const data = await res.json();
        setSlugAvailable(data.available);
      } catch (err) {
        console.error("Error checking slug:", err);
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    };

    const delay = setTimeout(checkAvailability, 400);
    return () => clearTimeout(delay);
  }, [teamSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, teamSlug }),
    });

    if (res.ok) {
      const { team } = await res.json();
      toast.success("Team created successfully!");
      setOpen(false);
      onSuccess?.(); // Refresh teams list
      router.push(`/teams/${team.teamSlug}`);
    } else {
      toast.error("Failed to create team. Please try again.");
    }
  };

  return (
    <ModalLayout
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Create a New Team"
      description="Enter the team name and URL slug. You can add more details later in Team Settings."
      withCard={true}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Team Name */}
        <FormField
          label="Team Name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter team name"
          required
        />

        {/* Team Slug */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Team Page URL
          </label>
          <div className="relative">
            <input
              type="text"
              value={teamSlug}
              onChange={(e) =>
                setTeamSlug(e.target.value.toLowerCase().replace(/\s+/g, "_"))
              }
              required
              className="w-full rounded-md border px-3 py-2 bg-background text-foreground"
            />
            {checkingSlug ? (
              <span className="absolute right-2 top-2 text-gray-400 text-sm">
                checking...
              </span>
            ) : slugAvailable === true ? (
              <CheckCircle className="absolute right-2 top-2 text-green-500 w-5 h-5" />
            ) : slugAvailable === false ? (
              <XCircle className="absolute right-2 top-2 text-red-500 w-5 h-5" />
            ) : null}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your team page URL:
            <br />
            <code>
              https://matscout.com/teams/{teamSlug || "your_team_slug"}
            </code>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!slugAvailable || checkingSlug || teamSlug.length < 3}
            className="btn btn-primary"
          >
            Create Team
          </Button>
        </div>
      </form>
    </ModalLayout>
  );
}
