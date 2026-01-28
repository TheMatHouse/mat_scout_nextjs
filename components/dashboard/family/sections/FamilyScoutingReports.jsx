"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";

import { Lock, LockOpen } from "lucide-react";

import FamilyMyScoutingReportsTab from "@/components/dashboard/family/sections/FamilyScouting/FamilyMyScoutingReportsTab";

import { verifyPasswordLocally } from "@/lib/crypto/locker";

/* -------------------------------------------------- */

const STORAGE_KEY = (teamId) => `ms:teamlock:${teamId}`;

const FamilyScoutingReports = ({ member }) => {
  const router = useRouter();

  /* ---------------- Tabs ---------------- */
  const [activeTab, setActiveTab] = useState("mine"); // mine | team

  /* ---------------- Team data ---------------- */
  const [familyTeams, setFamilyTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  /* ---------------- Team unlock ---------------- */
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [activeTeam, setActiveTeam] = useState(null);
  const [password, setPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [unlockedTeams, setUnlockedTeams] = useState({});

  /* -------------------------------------------------- */
  /* Load teams ONLY when Team tab is active             */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (activeTab !== "team") return;
    if (!member?.userId || !member?._id) return;

    let cancelled = false;

    (async () => {
      setLoadingTeams(true);
      try {
        const res = await fetch(
          `/api/dashboard/${member.userId}/family/${member._id}/scoutingReports/teams`,
          { cache: "no-store", credentials: "same-origin" },
        );
        if (!res.ok) throw new Error();

        const data = await res.json();
        if (!cancelled) {
          setFamilyTeams(Array.isArray(data?.teams) ? data.teams : []);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load team reports.");
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, member?.userId, member?._id]);

  /* -------------------------------------------------- */
  /* Team click (password gate)                         */
  /* -------------------------------------------------- */
  const handleTeamClick = async (team) => {
    const slug = team.teamSlug;
    if (!slug) return;

    try {
      const res = await fetch(`/api/teams/${slug}/security`, {
        credentials: "include",
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error();

      const json = await res.json();
      const t = json?.team || {};
      const sec = t.security || {};

      if (!sec.lockEnabled) {
        router.push(`/teams/${slug}/scouting-reports`);
        return;
      }

      if (unlockedTeams[slug]) {
        router.push(`/teams/${slug}/scouting-reports`);
        return;
      }

      setActiveTeam({
        _id: t._id,
        slug,
        teamName: t.teamName || team.teamName || "Team",
        security: sec,
      });
      setPassword("");
      setPasswordModalOpen(true);
    } catch {
      toast.error("Unable to load team security.");
    }
  };

  /* -------------------------------------------------- */
  /* Submit team password                               */
  /* -------------------------------------------------- */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!activeTeam) return;

    setSubmittingPassword(true);
    try {
      const sec = activeTeam.security;
      const ok = await verifyPasswordLocally(password.trim(), {
        lockEnabled: true,
        encVersion: sec.encVersion || "v1",
        kdf: {
          saltB64: sec.kdf?.saltB64,
          iterations: sec.kdf?.iterations,
        },
        verifierB64: sec.verifierB64,
      });

      if (!ok) {
        toast.error("Incorrect team password.");
        return;
      }

      sessionStorage.setItem(STORAGE_KEY(activeTeam._id), password.trim());
      setUnlockedTeams((p) => ({ ...p, [activeTeam.slug]: true }));
      setPasswordModalOpen(false);
      router.push(`/teams/${activeTeam.slug}/scouting-reports`);
    } finally {
      setSubmittingPassword(false);
    }
  };

  /* -------------------------------------------------- */
  /* RENDER                                             */
  /* -------------------------------------------------- */

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {member?.firstName
            ? `${member.firstName}'s Scouting Reports`
            : "Scouting Reports"}
        </h1>

        <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
          Scouting reports created for this family member and reports created by
          teams they belong to.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-300 dark:border-gray-700">
        <div className="inline-flex gap-1">
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-4 py-2 font-semibold rounded-t-md ${
              activeTab === "mine"
                ? "btn btn-primary"
                : "text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            My Reports
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 font-semibold rounded-t-md ${
              activeTab === "team"
                ? "btn btn-primary"
                : "text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            Team Reports
          </button>
        </div>
      </div>

      {/* My Reports */}
      {activeTab === "mine" && <FamilyMyScoutingReportsTab member={member} />}

      {/* Team Reports */}
      {activeTab === "team" && (
        <>
          {loadingTeams ? (
            <Spinner size={40} />
          ) : familyTeams.length === 0 ? (
            <p className="text-sm text-gray-900 dark:text-gray-100">
              This family member is not part of any teams.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {familyTeams.map((team) => (
                <div
                  key={team.teamId}
                  className="border rounded-xl p-4 bg-white dark:bg-gray-900"
                >
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {team.teamName}
                  </p>

                  <p className="text-xs mt-1 flex items-center gap-1">
                    {team.lockEnabled ? (
                      <>
                        <Lock className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-300">
                          Team password required
                        </span>
                      </>
                    ) : (
                      <>
                        <LockOpen className="w-3 h-3 text-green-400" />
                        <span className="text-green-300">No team password</span>
                      </>
                    )}
                  </p>

                  <Button
                    className="mt-3 bg-ms-blue-gray hover:bg-ms-blue text-white"
                    onClick={() => handleTeamClick(team)}
                  >
                    View Team Reports
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Password Modal */}
      {passwordModalOpen && activeTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Enter team password
            </h2>

            <p className="text-sm mt-1 text-gray-900 dark:text-gray-100">
              To view reports for {activeTeam.teamName}
            </p>

            <form
              onSubmit={handlePasswordSubmit}
              className="mt-4 space-y-4"
            >
              <input
                type="password"
                value={password}
                autoFocus
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="btn-cancel"
                  onClick={() => setPasswordModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPassword}
                  className="btn-submit"
                >
                  {submittingPassword ? "Verifying…" : "Unlock"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default FamilyScoutingReports;
