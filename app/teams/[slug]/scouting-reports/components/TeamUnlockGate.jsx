// app/teams/[slug]/scouting-reports/components/TeamUnlockGate.jsx
"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/shared/Spinner";
import { toast } from "react-toastify";

import {
  verifyPasswordLocally,
  unwrapTeamBoxKey,
  isWrappedTeamBoxKey,
} from "@/lib/crypto/locker";

// Store locally per team
const STORE_KEY = (teamId) => `ms:teamlock:${teamId}`;

export default function TeamUnlockGate({
  slug,
  team,
  onTeamResolved,
  onUnlocked,
  children,
}) {
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [password, setPassword] = useState("");
  const [teamData, setTeamData] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);

  /* -------------------------------------------------------
     Fetch full team security metadata first
  ------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      if (!slug) return;

      try {
        const res = await fetch(`/api/teams/${slug}/security`, {
          cache: "no-store",
        });

        const json = await res.json();
        if (!json?.team) {
          toast.error("Unable to load team security details.");
          return;
        }

        const t = json.team;
        setTeamData(t);

        onTeamResolved?.(t);

        const locked = !!t.security?.lockEnabled;
        setRequiresPassword(locked);
      } catch (e) {
        console.error("TeamUnlockGate load error:", e);
        toast.error("Failed to load team security.");
      } finally {
        setLoadingTeam(false);
      }
    })();
  }, [slug]);

  /* -------------------------------------------------------
     If no password required → auto-unlock
  ------------------------------------------------------- */
  useEffect(() => {
    if (loadingTeam) return;
    if (!teamData) return;

    if (!requiresPassword) {
      onUnlocked?.();
    }
  }, [loadingTeam, teamData, requiresPassword]);

  /* -------------------------------------------------------
     Attempt cached password before showing UI
  ------------------------------------------------------- */
  useEffect(() => {
    if (loadingTeam) return;

    if (!teamData?.security?.lockEnabled) return;

    const cached = sessionStorage.getItem(STORE_KEY(teamData._id));
    if (!cached) return;

    (async () => {
      try {
        const ok = await verifyPasswordLocally(cached, teamData.security);
        if (!ok) {
          sessionStorage.removeItem(STORE_KEY(teamData._id));
          return;
        }

        // If password is valid → attempt unwrapping TBK
        const wrapped = teamData.security?.encryption?.wrappedTeamKeyB64 || "";
        if (wrapped && isWrappedTeamBoxKey(wrapped)) {
          try {
            await unwrapTeamBoxKey(
              cached,
              wrapped,
              teamData.security?.kdf?.iterations,
            );

            onUnlocked?.();
            setRequiresPassword(false);
          } catch {
            // cached pass invalid for TBK
          }
        }
      } catch {
        // cached pass invalid
      }
    })();
  }, [loadingTeam, teamData]);

  /* -------------------------------------------------------
     Handle manual password submit
  ------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Please enter a password.");
      return;
    }

    setUnlocking(true);
    try {
      const ok = await verifyPasswordLocally(
        password.trim(),
        teamData.security,
      );
      if (!ok) {
        toast.error("Incorrect password.");
        return;
      }

      const wrapped = teamData.security?.encryption?.wrappedTeamKeyB64 || "";
      if (wrapped && isWrappedTeamBoxKey(wrapped)) {
        try {
          await unwrapTeamBoxKey(
            password.trim(),
            wrapped,
            teamData.security?.kdf?.iterations,
          );
        } catch (err) {
          toast.error("Unable to unwrap Team Key. Wrong password?");
          return;
        }
      }

      // Cache password
      sessionStorage.setItem(STORE_KEY(teamData._id), password.trim());

      setRequiresPassword(false);
      onUnlocked?.();
    } finally {
      setUnlocking(false);
    }
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  if (loadingTeam) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh]">
        <Spinner size={48} />
        <p className="mt-3 text-gray-900 dark:text-gray-100">Loading team…</p>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 font-semibold">
          Unable to load team security.
        </p>
      </div>
    );
  }

  // If password required
  if (requiresPassword) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] px-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Team Locked
        </h2>

        <p className="text-gray-800 dark:text-gray-200 mb-5 text-center max-w-md">
          This team is protected. Enter the password to unlock scouting reports.
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xs flex flex-col gap-3"
        >
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Team password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />

          <button
            type="submit"
            disabled={unlocking}
            className="btn-submit"
          >
            {unlocking ? "Verifying…" : "Unlock"}
          </button>
        </form>
      </div>
    );
  }

  // Unlocked → show children
  return <>{children}</>;
}
