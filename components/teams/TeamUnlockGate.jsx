// components/teams/TeamUnlockGate.jsx
"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

/* -----------------------------------------------------------
   Base64 Helpers
----------------------------------------------------------- */
function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function bytesToB64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

/* -----------------------------------------------------------
   PBKDF2
----------------------------------------------------------- */
async function deriveKey(password, saltB64, iterations) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey", "deriveBits"]
  );

  const saltBytes = b64ToBytes(saltB64);

  // Raw PBKDF2 32 bytes
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations,
    },
    keyMaterial,
    32 * 8
  );

  return new Uint8Array(bits);
}

/* -----------------------------------------------------------
   Verify SHA-256
----------------------------------------------------------- */
async function sha256(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(buf);
}

/* -----------------------------------------------------------
   AES-GCM unwrap TBK
----------------------------------------------------------- */
async function unwrapTBKClient(derivedKeyBytes, wrapped) {
  const key = await crypto.subtle.importKey(
    "raw",
    derivedKeyBytes,
    "AES-GCM",
    false,
    ["decrypt"]
  );

  const iv = b64ToBytes(wrapped.ivB64);
  const tag = b64ToBytes(wrapped.tagB64);
  const ciphertext = b64ToBytes(wrapped.ciphertextB64);

  const data = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: undefined,
      tagLength: 128,
    },
    key,
    concatBuffers(ciphertext, tag)
  );

  return new Uint8Array(data);
}

// GCM requires ciphertext || tag in one buffer
function concatBuffers(ct, tag) {
  const out = new Uint8Array(ct.length + tag.length);
  out.set(ct, 0);
  out.set(tag, ct.length);
  return out;
}

/* -----------------------------------------------------------
   Session Keys
----------------------------------------------------------- */
const PW_KEY = (teamId) => `ms:team_pw:${teamId}`;
const TBK_KEY = (teamId) => `ms:team_tbk:${teamId}`;

/* ======================================================================
   COMPONENT
====================================================================== */
const TeamUnlockGate = ({ slug, onTeamResolved, onUnlocked, children }) => {
  const [team, setTeam] = useState(null);
  const [security, setSecurity] = useState(null);

  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [hasLock, setHasLock] = useState(false);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* -----------------------------------------------------------
     Load security block
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
        const t = json.team || {};
        const sec = t.security || {};

        setTeam(t);
        setSecurity(sec);
        if (onTeamResolved) onTeamResolved(t);

        if (!sec.lockEnabled) {
          setHasLock(false);
          setUnlocked(true);
          onUnlocked && onUnlocked();
          return;
        }

        setHasLock(true);

        const cachedPw = sessionStorage.getItem(PW_KEY(t._id));
        if (cachedPw) {
          const ok = await attemptUnlock(t, sec, cachedPw);
          if (ok) {
            setUnlocked(true);
            onUnlocked && onUnlocked();
            return;
          }
        }
      } catch (err) {
        console.error("Unlock load error:", err);
      } finally {
        setChecking(false);
      }
    })();
  }, [slug]);

  /* -----------------------------------------------------------
     Try unlocking with a given password
  ----------------------------------------------------------- */
  const attemptUnlock = async (team, sec, pw) => {
    try {
      const { kdf, verifierB64, wrappedTBK } = sec;

      // 1. derive key
      const derived = await deriveKey(pw, kdf.saltB64, kdf.iterations);

      // 2. verify
      const hash = await sha256(derived);
      if (bytesToB64(hash) !== verifierB64) return false;

      // 3. unwrap TBK
      const tbk = await unwrapTBKClient(derived, wrappedTBK);
      const tbkB64 = bytesToB64(tbk);

      // 4. store session
      sessionStorage.setItem(PW_KEY(team._id), pw);
      sessionStorage.setItem(TBK_KEY(team._id), tbkB64);

      // provide globally for decrypt functions
      window.__MS_TEAM_TBK__ = tbkB64;
      return true;
    } catch (err) {
      console.error("unlock error:", err);
      return false;
    }
  };

  /* -----------------------------------------------------------
     Manual submit
  ----------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!team?._id) return;

    setSubmitting(true);
    setError("");

    const ok = await attemptUnlock(team, security, password);

    if (!ok) {
      setError("Incorrect team password.");
      setSubmitting(false);
      return;
    }

    setUnlocked(true);
    setPassword("");
    onUnlocked && onUnlocked();
    setSubmitting(false);
  };

  /* UI States */
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

  /* Locked UI */
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

          {error && <p className="text-sm text-red-500">{error}</p>}

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
