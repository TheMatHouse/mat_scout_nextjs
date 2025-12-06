// components/teams/TeamUnlockGate.jsx
"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

import { verifyPasswordLocally, getCachedTBK } from "@/lib/crypto/locker";

const PW_KEY = (teamId) => `ms:team_pw:${teamId}`;
const TBK_KEY = (teamId) => `ms:teamlock:${teamId}`; // 🔥 unified – same as locker.js

const TeamUnlockGate = ({ slug, onTeamResolved, onUnlocked, children }) => {
  const [team, setTeam] = useState(null);
  const [security, setSecurity] = useState(null);

  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [hasLock, setHasLock] = useState(false);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* --------------------------------------------------------
     Load security block + auto-unlock
  -------------------------------------------------------- */
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

        const json = await res.json();
        const t = json.team || {};
        const sec = t.security || {};

        setTeam(t);
        setSecurity(sec);
        onTeamResolved?.(t);

        if (!sec.lockEnabled) {
          setHasLock(false);
          setUnlocked(true);
          onUnlocked?.();
          return;
        }

        setHasLock(true);

        const teamId = t._id;
        if (!teamId) return;

        const cachedPw = sessionStorage.getItem(PW_KEY(teamId));

        if (cachedPw) {
          const ok = await verifyPasswordLocally(cachedPw, sec, teamId);

          if (ok) {
            const tbk = getCachedTBK(teamId);

            if (tbk) {
              window.__MS_TEAM_TBK__ = tbk;
              setUnlocked(true);
              onUnlocked?.();
              return;
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    })();
  }, [slug, onTeamResolved, onUnlocked]);

  /* --------------------------------------------------------
     Manual unlock
  -------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!team?._id) {
      setError("Invalid team.");
      return;
    }

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

      // 🔥 Save password + TBK consistently
      sessionStorage.setItem(PW_KEY(teamId), password);
      sessionStorage.setItem(TBK_KEY(teamId), tbk);

      window.__MS_TEAM_TBK__ = tbk;

      setUnlocked(true);
      setPassword("");
      onUnlocked?.();
    } catch (err) {
      console.error(err);
      setError("Error verifying password.");
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------------------------------
     UI States
  -------------------------------------------------------- */
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

  return (
    <div className="flex flex-col justify-center items-center h-[60vh]">
      <div className="w-full max-w-sm rounded-2xl border bg-[var(--color-card)] p-6 space-y-4">
        <h2 className="text-xl font-semibold">Team Password Required</h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter team password"
              className="w-full rounded-xl border px-4 py-3 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || !password}
            >
              {submitting ? "Unlocking…" : "Unlock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamUnlockGate;
