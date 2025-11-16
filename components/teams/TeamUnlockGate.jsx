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
  team: initialTeam,
  onTeamResolved,
  onUnlocked,
  children,
}) => {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [hasLock, setHasLock] = useState(false);
  const [team, setTeam] = useState(initialTeam || null);
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

        // Fetch team security info
        const res = await fetch(`/api/teams/${slug}/security`, {
          credentials: "include",
          headers: { accept: "application/json" },
        });

        if (!res.ok) {
          console.error("TeamUnlockGate /security error:", res.status);
          setSecurityError(true);
          return;
        }

        const json = await res.json().catch(() => ({}));
        const t = json?.team || {};
        const sec = t.security || {};
        const lockEnabled = !!sec.lockEnabled;

        if (t?._id) {
          setTeam((prev) => prev || t);
          if (onTeamResolved) onTeamResolved(t);
        }

        // No lock => just render children
        if (!lockEnabled) {
          setHasLock(false);
          setUnlocked(true);
          if (onUnlocked) onUnlocked();
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

        setHasLock(true);
        setSecurity(normalizedSec);

        const teamId = t?._id;
        if (!teamId) {
          toast.error("Unable to verify team lock.");
          setSecurityError(true);
          return;
        }

        // Try cached password first
        const cached = sessionStorage.getItem(STORAGE_KEY(teamId)) || "";
        if (cached && normalizedSec.kdf.saltB64 && normalizedSec.verifierB64) {
          const ok = await verifyPasswordLocally(cached, normalizedSec);
          if (ok) {
            setUnlocked(true);
            if (onUnlocked) onUnlocked();
            return;
          }
        }
      } catch (err) {
        console.error("TeamUnlockGate error:", err);
        toast.error("Error checking team lock.");
        setSecurityError(true);
      } finally {
        setChecking(false);
      }
    })();
  }, [slug, onTeamResolved, onUnlocked]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!security) {
      toast.error("Missing team security configuration.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const ok = await verifyPasswordLocally(password, security);

      if (!ok) {
        // This is the “wrong password” UX
        setError("Incorrect team password.");
        return;
      }

      const teamId = team?._id;
      if (teamId) {
        // Some environments can throw here (storage disabled / blocked)
        try {
          // 🔧 FIXED: use STORAGE_KEY, not STORE_KEY
          sessionStorage.setItem(STORAGE_KEY(teamId), password);
        } catch (storageErr) {
          console.warn(
            "Unable to cache team password in sessionStorage:",
            storageErr
          );
        }
      }

      setUnlocked(true);
      setPassword("");
      if (onUnlocked) onUnlocked();
    } catch (err) {
      console.error("Unlock error:", err);
      // Show the actual error if we have a message, otherwise the generic one
      toast.error(err?.message || "Error verifying password.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Render states ----------

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

  // ---------- Locked UI with eye icon ----------

  return (
    <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
      <div className="w-full max-w-sm rounded-2xl border bg-[var(--color-card)] p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Team Password Required
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          This team has a lock enabled. Enter the team password to view scouting
          reports.
        </p>

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
                className="w-full rounded-xl border
                           bg-white dark:bg-neutral-900
                           text-gray-900 dark:text-gray-100
                           px-4 py-3 pr-12"
                placeholder="Enter team password"
                autoComplete="off"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center
                           text-gray-500 hover:text-gray-700
                           dark:text-gray-400 dark:hover:text-gray-200
                           z-20"
                aria-label={showPassword ? "Hide password" : "Show password"}
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
              className="bg-ms-blue-gray hover:bg-ms-blue text-white"
            >
              {submitting ? "Unlocking…" : "Unlock"}
            </Button>
          </div>
        </form>

        <p className="text-xs text-gray-600 dark:text-gray-400">
          The password is never stored on the server. A key is derived locally
          and verified against the team&apos;s lock settings.
        </p>
      </div>
    </div>
  );
};

export default TeamUnlockGate;
