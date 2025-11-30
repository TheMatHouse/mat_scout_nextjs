// components/dashboard/scouting/TeamScoutingReportsTab.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Shield, Lock, LockOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import Spinner from "@/components/shared/Spinner";

import { verifyPasswordLocally } from "@/lib/crypto/locker";

const STORAGE_KEY = (teamId) => `ms:teamlock:${teamId}`;

const TeamScoutingReportsTab = ({ user }) => {
  const router = useRouter();

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [activeTeam, setActiveTeam] = useState(null);
  const [password, setPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [unlockedTeams, setUnlockedTeams] = useState({});

  // ------------------------------------------------------------------
  // Load **ALL teams the user belongs to** (owner / manager / coach / member)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!user?._id) return;

    (async () => {
      setLoadingTeams(true);
      try {
        const uid = encodeURIComponent(String(user._id));
        const res = await fetch(`/api/dashboard/${uid}/teams`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        });

        const text = await res.text();
        let payload = null;
        try {
          payload = JSON.parse(text);
        } catch {
          payload = null;
        }

        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.teams)
          ? payload.teams
          : [];

        setTeams(list);
      } catch (err) {
        console.error("Error loading dashboard teams:", err);
        toast.error("Failed to load your teams.");
      } finally {
        setLoadingTeams(false);
      }
    })();
  }, [user?._id]);

  useEffect(() => {
    console.log("TeamScoutingReportsTab user =", user);
    console.log("TeamScoutingReportsTab user._id =", user?._id);
  }, [user]);
  // ------------------------------------------------------------------
  const goToTeamReports = (slug) => {
    if (!slug) return;
    router.push(`/teams/${encodeURIComponent(slug)}/scouting-reports`);
  };

  // ------------------------------------------------------------------
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
        console.error("/security error:", res.status);
        toast.error("Unable to load team security info.");
        return;
      }

      const json = await res.json().catch(() => ({}));
      const fullTeam = json?.team || {};
      const sec = fullTeam.security || {};
      const lockEnabled = !!sec.lockEnabled;

      if (!lockEnabled) {
        goToTeamReports(slug);
        return;
      }

      if (unlockedTeams[slug]) {
        goToTeamReports(slug);
        return;
      }

      setActiveTeam({
        _id: fullTeam._id,
        slug,
        teamName: fullTeam.teamName || team.teamName || "Team",
        security: sec,
      });
      setPassword("");
      setPasswordModalOpen(true);
    } catch (err) {
      console.error("Error loading team security:", err);
      toast.error("Failed to load team security details.");
    }
  };

  // ------------------------------------------------------------------
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!activeTeam?.slug) return;

    const slug = activeTeam.slug;
    const passwordTrimmed = password.trim();
    if (!passwordTrimmed) {
      toast.error("Please enter the team password.");
      return;
    }

    setSubmittingPassword(true);
    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/security`,
        {
          credentials: "include",
          headers: { accept: "application/json" },
        }
      );

      if (!res.ok) {
        toast.error("Unable to verify team password.");
        return;
      }

      const json = await res.json().catch(() => ({}));
      const t = json?.team || {};
      const sec = t.security || {};
      const lockEnabled = !!sec.lockEnabled;

      if (!lockEnabled) {
        setUnlockedTeams((prev) => ({ ...prev, [slug]: true }));
        setPassword("");
        setPasswordModalOpen(false);
        goToTeamReports(slug);
        return;
      }

      const normalizedSec = {
        lockEnabled: true,
        encVersion: sec.encVersion || "v1",
        kdf: {
          saltB64: sec.kdf?.saltB64 || "",
          iterations: sec.kdf?.iterations || 250000,
        },
        verifierB64: sec.verifierB64 || "",
      };

      const ok = await verifyPasswordLocally(passwordTrimmed, normalizedSec);
      if (!ok) {
        toast.error("Incorrect team password.");
        return;
      }

      try {
        sessionStorage.setItem(STORAGE_KEY(t._id), passwordTrimmed);
      } catch {}

      setUnlockedTeams((prev) => ({ ...prev, [slug]: true }));
      setPassword("");
      setPasswordModalOpen(false);
      goToTeamReports(slug);
    } catch (err) {
      toast.error("Unable to verify team password.");
    } finally {
      setSubmittingPassword(false);
    }
  };

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

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
            These are the teams you're a member of. Selecting a team will take
            you to that team's scouting reports.
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
              const lockEnabled = team?.security
                ? !!team.security.lockEnabled
                : false;
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
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              To view scouting reports for{" "}
              <span className="font-medium">
                {activeTeam.teamName || "this team"}
              </span>
              , please enter the password.
            </p>

            <form
              onSubmit={handlePasswordSubmit}
              className="mt-4 space-y-4"
            >
              <div>
                <label
                  htmlFor="team-password"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Team password
                </label>
                <input
                  id="team-password"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ms-blue focus:border-ms-blue"
                  placeholder="Enter team password"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submittingPassword}
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
                  disabled={submittingPassword || !password.trim()}
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
