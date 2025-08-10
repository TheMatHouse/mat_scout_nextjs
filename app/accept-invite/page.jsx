// app/accept-invite/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/shared/Spinner";
import { useUser } from "@/context/UserContext"; // adjust if named differently

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();
  const { user } = useUser?.() || {}; // adapt to your user context

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");

  // Minor flow state
  const [family, setFamily] = useState([]); // ← will hold familyMembers from /api/family
  const [fmChoice, setFmChoice] = useState("existing"); // "existing" | "new"
  const [selectedFamilyId, setSelectedFamilyId] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        if (!token) {
          setError("Missing invitation token.");
          setLoading(false);
          return;
        }

        // 1) Lookup invite meta
        const res = await fetch(
          `/api/invitations/lookup?token=${encodeURIComponent(token)}`
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Invitation not found or expired.");
        }
        const data = await res.json();
        setInvite(data.invite);

        // 2) If logged in and minor invite → load YOUR existing endpoint
        if (user && data.invite?.isMinor) {
          const famRes = await fetch("/api/family", { cache: "no-store" });
          if (famRes.ok) {
            const fam = await famRes.json();
            // fam.familyMembers is your shape
            setFamily(
              Array.isArray(fam.familyMembers) ? fam.familyMembers : []
            );
          }
        }
      } catch (e) {
        setError(e.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, user]);

  const loginHref = useMemo(() => {
    const qp = new URLSearchParams({
      redirect: `/accept-invite?token=${token}`,
    });
    return `/login?${qp.toString()}`;
  }, [token]);

  async function acceptAdult() {
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not accept invitation.");
      router.replace(`/teams/${j.teamSlug}`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function acceptMinor() {
    try {
      if (fmChoice === "existing") {
        if (!selectedFamilyId) throw new Error("Select an athlete first.");
        // use your accept route as previously implemented
        const res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, familyMemberId: selectedFamilyId }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || "Could not accept invitation.");
        router.replace(`/teams/${j.teamSlug}`);
      } else {
        // create new family member using invite names on the server (as we coded)
        const res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, createFamily: true }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || "Could not accept invitation.");
        router.replace(`/teams/${j.teamSlug}`);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3">
          <Spinner size={24} />
          <p className="text-gray-500">Loading invitation…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold mb-2">Invitation</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!invite) return null;

  const title = invite.isMinor
    ? `Invite for ${invite.firstName} ${invite.lastName}`
    : `Invite for ${invite.firstName || "you"} ${invite.lastName || ""}`.trim();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">{invite.teamName}</h1>
      <p className="text-gray-500 mb-6">
        {title} to join as <strong>{invite.role}</strong>. Expires{" "}
        {new Date(invite.expiresAt).toLocaleDateString()}.
      </p>

      {!user ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <p className="mb-3">You need to log in to accept this invitation.</p>
          <Link
            href={loginHref}
            className="inline-block rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            Log in / Sign up
          </Link>
        </div>
      ) : !invite.isMinor ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <button
            onClick={acceptAdult}
            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            Accept Invitation
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
          {/* Existing athlete option */}
          <div>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="fmChoice"
                value="existing"
                checked={fmChoice === "existing"}
                onChange={() => setFmChoice("existing")}
              />
              <span>Link to an existing athlete</span>
            </label>
            {fmChoice === "existing" && (
              <div className="mt-3">
                {family.length ? (
                  <select
                    className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                    value={selectedFamilyId}
                    onChange={(e) => setSelectedFamilyId(e.target.value)}
                  >
                    <option value="">Select athlete…</option>
                    {family.map((f) => (
                      <option
                        key={f._id}
                        value={f._id}
                      >
                        {f.firstName} {f.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-500">No athletes found.</p>
                )}
              </div>
            )}
          </div>

          {/* New athlete option */}
          <div>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="fmChoice"
                value="new"
                checked={fmChoice === "new"}
                onChange={() => setFmChoice("new")}
              />
              <span>Create a new athlete (from invite name)</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              We’ll create an athlete profile for {invite.firstName}{" "}
              {invite.lastName}.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={acceptMinor}
            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            Accept Invitation
          </button>
        </div>
      )}
    </div>
  );
}
