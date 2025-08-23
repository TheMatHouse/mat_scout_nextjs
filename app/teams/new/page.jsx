"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import { adminTeamCreated } from "@/lib/analytics/adminEvents";

export default function CreateTeamPage() {
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const router = useRouter();

  // Auto-generate slug from team name
  useEffect(() => {
    if (!teamName.trim()) return;

    const suggested = teamName.trim().toLowerCase().replace(/\s+/g, "_");

    setTeamSlug((prevSlug) => {
      const cleanPrev = prevSlug.trim().toLowerCase().replace(/\s+/g, "_");
      const isDefault = cleanPrev === "" || suggested.startsWith(cleanPrev);
      return isDefault ? suggested : prevSlug;
    });
  }, [teamName]);

  // Check slug availability
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
      adminTeamCreated({ method: "manual" });
      router.push(`/teams/${team.teamSlug}`);
    } else {
      toast.error(
        "Failed to create team. Please check the form and try again."
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-md p-6 sm:p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Create a New Team
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
          Use the form below to create your team by entering a team name and URL
          slug. This slug will be used to generate your team’s page URL (e.g.{" "}
          <code>matscout.com/teams/your_slug</code>). You can add more
          information about your team later in the Team Settings tab.
        </p>

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
          <div className="flex gap-4 pt-2">
            <Button
              type="submit"
              disabled={!slugAvailable || checkingSlug || teamSlug.length < 3}
              className="btn btn-primary"
            >
              Create Team
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/teams")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
