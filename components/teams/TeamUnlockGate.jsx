// components/teams/TeamUnlockGate.jsx
"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

import { verifyPasswordLocally, getCachedTBK } from "@/lib/crypto/locker";

const PW_KEY = (teamId) => `ms:team_pw:${teamId}`;
const TBK_KEY = (teamId) => `ms:team_tbk:${teamId}`;

export default function TeamUnlockGate({
  slug,
  onTeamResolved,
  onUnlocked,
  children,
}) {
  const [team, setTeam] = useState(null);
  const [security, setSecurity] = useState(null);

  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [hasLock, setHasLock] = useState(false);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ------------------------------------------------------------------
     LOAD SECURITY BLOCK FOR TEAM
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        setChecking(true);

        const res = await fetch(`/api/teams/${slug}/security`, {
          credentials: "include",
          headers: { accept: "application/json" },
        });

        if (!res.ok) {
          setChecking(false);
          return;
        }

        const json = await res.json().catch(() => ({}));
        const t = json.team || {};
        const sec = t.security || {};

        setTeam(t);
        setSecurity(sec);

        if (onTeamResolved) onTeamResolved(t);

        if (!sec.lockEnabled) {
          setHasLock(false);
          setUnlocked(true);
          if (onUnlocked) onUnlocked();
          return;
        }

        setHasLock(true);

        const teamId = t._id;
        if (!teamId) {
          setChecking(false);
          return;
        }

        /* ----------------------------------------------------------
           AUTO UNLOCK (if password/TBK exist)
        ---------------------------------------------------------- */
        const cachedPw = sessionStorage.getItem(PW_KEY(teamId));
        const cachedTbk = sessionStorage.getItem(TBK_KEY(teamId));

        if (cachedPw) {
          const ok = await verifyPasswordLocally(cachedPw, sec, teamId);

          if (ok) {
            const tbk = cachedTbk || getCachedTBK(teamId);
            if (tbk) {
              try {
                sessionStorage.setItem(TBK_KEY(teamId), tbk);
              } catch {}
              window.__MS_TEAM_TBK__ = tbk;

              setUnlocked(true);
              if (onUnlocked) onUnlocked();
              return;
            }
          }
        }
      } catch (err) {
        console.error("UnlockGate error:", err);
      } finally {
        setChecking(false);
      }
    })();
  }, [slug]);

  /* ------------------------------------------------------------------
     HANDLE MANUAL PASSWORD SUBMIT
  ------------------------------------------------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!team || !team._id) return;

    const teamId = team._id;

    setSubmitting(true);
    setError("");

    try {
      const ok = await verifyPasswordLocally(password, security, teamId);
      if (!ok) {
        setError("Incorrect team password.");
        setSubmitting(false);
        return;
      }

      const tbk = getCachedTBK(teamId);
      if (!tbk) {
        setError("Unable to load Team Box Key.");
        setSubmitting(false);
        return;
      }

      /* ----------------------------------------------------------
         SAVE to session cache
      ---------------------------------------------------------- */
      try {
        sessionStorage.setItem(PW_KEY(teamId), password);
      } catch {}
      try {
        sessionStorage.setItem(TBK_KEY(teamId), tbk);
      } catch {}

      window.__MS_TEAM_TBK__ = tbk;

      setUnlocked(true);
      setPassword("");
      if (onUnlocked) onUnlocked();
    } catch (err) {
      console.error(err);
      setError("Error verifying password.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------
     UI STATES
  ------------------------------------------------------------------ */
  if (checking) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh]">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Checking team lock…
        </p>
      </div>
    );
  }

  if (!hasLock || unlocked) {
    return <>{children}</>;
  }

  /* ------------------------------------------------------------------
     LOCKED UI
  ------------------------------------------------------------------ */
  return (
    <div className="flex flex-col justify-center items-center h-[60vh]">
      <div className="w-full max-w-sm rounded-2xl border bg-[var(--color-card)] p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Team Password Required
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border bg-white dark:bg-neutral-900 
                text-gray-900 dark:text-gray-100 px-4 py-3 pr-12"
              placeholder="Enter team password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || !password}
              className="bg-ms-blue-gray hover:bg-ms-blue text-white"
            >
              {submitting ? "Unlocking…" : "Unlock"}
            </Button>
          </div>
        </form>

        <p className="text-xs text-gray-600 dark:text-gray-400">
          The password never leaves your device.
        </p>
      </div>
    </div>
  );
}
