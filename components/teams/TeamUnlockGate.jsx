"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

/**
 * Option A–compatible TeamUnlockGate
 *
 * - NO local password verification
 * - Uses slug-based session key
 * - Dashboard + team pages share unlock state
 */

const PW_KEY = (slug) => `ms:teamlock:${slug}`;

const TeamUnlockGate = ({ slug, children }) => {
  const [checking, setChecking] = useState(true);
  const [hasLock, setHasLock] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* -----------------------------------------------------------
     Load team security & auto-unlock if session password exists
  ----------------------------------------------------------- */
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
        const sec = json?.team?.security || {};

        if (!sec.lockEnabled) {
          setHasLock(false);
          setUnlocked(true);
          return;
        }

        setHasLock(true);

        // Option A: trust session password if present
        const cachedPw = sessionStorage.getItem(PW_KEY(slug));
        if (cachedPw) {
          setUnlocked(true);
          return;
        }
      } catch (err) {
        console.error("TeamUnlockGate error:", err);
      } finally {
        setChecking(false);
      }
    })();
  }, [slug]);

  /* -----------------------------------------------------------
     Manual submit (store password only)
  ----------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    setSubmitting(true);

    try {
      // Option A: do NOT verify locally
      sessionStorage.setItem(PW_KEY(slug), password);
      setUnlocked(true);
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  /* -----------------------------------------------------------
     UI
  ----------------------------------------------------------- */
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
};

export default TeamUnlockGate;
