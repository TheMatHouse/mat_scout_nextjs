"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Shield, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/shared/Spinner";

const STORAGE_KEY = (slug) => `ms:teamlock:${slug}`;

const TeamScoutingReportsTab = ({ user }) => {
  const router = useRouter();

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [activeTeam, setActiveTeam] = useState(null);
  const [password, setPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [unlockedTeams, setUnlockedTeams] = useState({});

  // --------------------------------------------------------------
  useEffect(() => {
    if (!user?._id) {
      setLoadingTeams(false);
      return;
    }

    (async () => {
      setLoadingTeams(true);
      try {
        const uid = encodeURIComponent(String(user._id));
        const res = await fetch(`/api/dashboard/${uid}/teams`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        });

        const payload = await res.json().catch(() => null);

        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.teams)
          ? payload.teams
          : [];

        setTeams(list);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load your teams.");
      } finally {
        setLoadingTeams(false);
      }
    })();
  }, [user?._id]);

  // --------------------------------------------------------------
  const goToTeamReports = (slug) => {
    if (!slug) return;
    router.push(`/teams/${encodeURIComponent(slug)}/scouting-reports`);
  };

  // --------------------------------------------------------------
  const handleTeamClick = async (team) => {
    const slug = team.teamSlug || team.slug || "";
    if (!slug) return;

    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/security`,
        {
          credentials: "include",
          headers: { accept: "application/json" },
        }
      );

      if (!res.ok) {
        toast.error("Unable to load team security info.");
        return;
      }

      const json = await res.json().catch(() => ({}));
      const fullTeam = json?.team || {};
      const sec = fullTeam.security || {};

      if (!sec.lockEnabled || unlockedTeams[slug]) {
        goToTeamReports(slug);
        return;
      }

      setActiveTeam({
        _id: fullTeam._id,
        slug,
        teamName: fullTeam.teamName || team.teamName || "Team",
      });

      setPassword("");
      setPasswordModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load team security details.");
    }
  };

  // --------------------------------------------------------------
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!activeTeam?.slug) return;

    const pwd = password.trim();
    if (!pwd) {
      toast.error("Please enter the team password.");
      return;
    }

    setSubmittingPassword(true);

    try {
      // Option A: dashboards do NOT verify locally
      try {
        sessionStorage.setItem(STORAGE_KEY(activeTeam.slug), pwd);
      } catch {}

      setUnlockedTeams((prev) => ({
        ...prev,
        [activeTeam.slug]: true,
      }));

      setPassword("");
      setPasswordModalOpen(false);
      goToTeamReports(activeTeam.slug);
    } finally {
      setSubmittingPassword(false);
    }
  };

  // --------------------------------------------------------------
  if (loadingTeams) {
    return (
      <div className="flex flex-col justify-center items-center h-[40vh]">
        <Spinner size={48} />
        <p className="mt-2 text-base text-gray-900 dark:text-gray-100">
          Loading your teams…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-ms-blue" />
          <p className="text-sm text-gray-900 dark:text-gray-100">
            These are the teams you're a member of.
          </p>
        </div>

        {teams.length === 0 ? (
          <p className="text-sm text-gray-900 dark:text-gray-100">
            You're not a member of any teams yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {teams.map((team) => {
              const slug = team.teamSlug || team.slug || "";
              const lockEnabled = !!team?.security?.lockEnabled;
              const isUnlocked = !!unlockedTeams[slug];

              return (
                <div
                  key={team._id || slug}
                  className="flex flex-col justify-between border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm p-4 gap-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {team.teamName || "Unnamed Team"}
                    </p>
                    <p className="text-xs mt-1 flex items-center gap-1">
                      {lockEnabled ? (
                        <>
                          <Lock className="w-3 h-3 text-yellow-500" />
                          <span className="text-yellow-300">
                            {isUnlocked
                              ? "Password verified for this session"
                              : "Team password required"}
                          </span>
                        </>
                      ) : (
                        <>
                          <LockOpen className="w-3 h-3 text-green-500" />
                          <span className="text-green-300">
                            No team password set
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      disabled={!slug}
                      onClick={() => handleTeamClick(team)}
                      className="bg-ms-blue-gray hover:bg-ms-blue text-white text-sm"
                    >
                      View Scouting Reports
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {passwordModalOpen && activeTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Enter team password
            </h2>

            <form
              onSubmit={handlePasswordSubmit}
              className="mt-4 space-y-4"
            >
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                placeholder="Team password"
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setActiveTeam(null);
                    setPassword("");
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={submittingPassword}
                  className="bg-ms-blue-gray hover:bg-ms-blue text-white"
                >
                  {submittingPassword ? "Verifying…" : "Unlock Team"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamScoutingReportsTab;
