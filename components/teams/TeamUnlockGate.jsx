// components/teams/TeamUnlockGate.jsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { verifyPasswordLocally } from "@/lib/crypto/locker";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

const STORAGE_KEY = (teamId) => `ms:teamlock:${teamId}`;

const TeamUnlockGate = ({
  slug,
  team: _initialTeam, // IGNORE this version completely
  onTeamResolved,
  onUnlocked,
  children,
}) => {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [hasLock, setHasLock] = useState(false);

  // 🔥 Always overwrite with the full-security version from /security
  const [team, setTeam] = useState(null);

  const [security, setSecurity] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [securityError, setSecurityError] = useState(false);

  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        setChecking(true);
        setError("");
        setSecurityError(false);

        // Always load the authoritative security block
        const res = await fetch(`/api/teams/${slug}/security`, {
          credentials: "include",
          headers: { accept: "application/json" },
        });

        if (!res.ok) {
          setSecurityError(true);
          return;
        }

        const json = await res.json().catch(() => ({}));
        const t = json.team || {};
        const sec = t.security || {};

        // 🔥 Overwrite — always trust `/security`
        setTeam(t);
        if (onTeamResolved) onTeamResolved(t);

        if (!sec.lockEnabled) {
          setHasLock(false);
          setUnlocked(true);
          if (onUnlocked) onUnlocked();
          return;
        }

        setHasLock(true);
        setSecurity(sec);

        const teamId = t._id;
        const cached = sessionStorage.getItem(STORAGE_KEY(teamId)) || "";

        if (cached && sec.kdf?.saltB64 && sec.verifierB64) {
          const ok = await verifyPasswordLocally(cached, sec);
          if (ok) {
            setUnlocked(true);
            if (onUnlocked) onUnlocked();
            return;
          }
        }
      } catch (err) {
        console.error("TeamUnlockGate error:", err);
        setSecurityError(true);
      } finally {
        setChecking(false);
      }
    })();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!security) {
      toast.error("Missing security configuration.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const ok = await verifyPasswordLocally(password, security);

      if (!ok) {
        setError("Incorrect team password.");
        return;
      }

      try {
        sessionStorage.setItem(STORAGE_KEY(team._id), password);
      } catch {}

      setUnlocked(true);
      setPassword("");
      if (onUnlocked) onUnlocked();
    } catch (err) {
      toast.error(err?.message || "Error verifying password.");
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------- UI STATES --------------------
  if (checking) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Checking team lock…
        </p>
      </div>
    );
  }

  if (securityError) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
        <div className="w-full max-w-sm rounded-2xl border bg-[var(--color-card)] p-6 space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Unable to verify team lock
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!hasLock || unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
      <div className="w-full max-w-sm rounded-2xl border bg-[var(--color-card)] p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Team Password Required
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Team Password
            </label>

            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border bg-white dark:bg-neutral-900
                           text-gray-900 dark:text-gray-100 px-4 py-3 pr-12"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500
                           hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || !password}
              className="btn-submit"
            >
              {submitting ? "Unlocking…" : "Unlock"}
            </Button>
          </div>
        </form>

        <p className="text-xs text-gray-600 dark:text-gray-400">
          The password is never stored on the server.
        </p>
      </div>
    </div>
  );
};

export default TeamUnlockGate;
