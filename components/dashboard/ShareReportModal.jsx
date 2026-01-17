"use client";

import { useEffect, useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";
import { toast } from "react-toastify";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function displayUserName(u) {
  if (!u) return "";
  const first = String(u.firstName || "").trim();
  const last = String(u.lastName || "").trim();
  const full = `${first} ${last}`.trim();
  return (
    full ||
    String(u.name || "").trim() ||
    String(u.username || "").trim() ||
    String(u.email || "").trim()
  );
}

function displayFamilyName(f) {
  if (!f) return "";
  const first = String(f.firstName || "").trim();
  const last = String(f.lastName || "").trim();
  const full = `${first} ${last}`.trim();
  return full || String(f.username || "").trim();
}

function displaySearchPrimary(r) {
  // Prefer label (real person name) if present, otherwise username
  const label = String(r?.label || "").trim();
  const username = String(r?.username || "").trim();
  return label || username || "Unknown";
}

function displaySearchSecondary(r) {
  // Keep this helpful but not noisy: show @username, and (optionally) email if no username
  const username = String(r?.username || "").trim();
  const email = String(r?.email || "").trim();
  if (username) return `@${username}`;
  return email || "";
}

function ShareReportModal({
  open,
  onClose,
  ownerId, // (you said [userId] overall; leaving prop name as-is so you don't have to refactor callers)
  documentType,
  documentId,
}) {
  const [input, setInput] = useState("");
  const [scope, setScope] = useState("one");
  const [loading, setLoading] = useState(false);

  const [shares, setShares] = useState([]);
  const [invites, setInvites] = useState([]);

  const [searchResults, setSearchResults] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      loadShares();
      resetInput();
    }
  }, [open]);

  function resetInput() {
    setInput("");
    setSearchResults([]);
    setSelectedTarget(null);
  }

  async function loadShares() {
    try {
      const res = await fetch(
        `/api/dashboard/${ownerId}/shares?documentType=${documentType}&documentId=${documentId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setShares(Array.isArray(data?.shares) ? data.shares : []);
      setInvites(Array.isArray(data?.invites) ? data.invites : []);
    } catch {
      setShares([]);
      setInvites([]);
    }
  }

  /* -------- Username / Family search ---------- */
  useEffect(() => {
    if (!input || isValidEmail(input)) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;

    async function search() {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/dashboard/${ownerId}/share-search?q=${encodeURIComponent(
            input
          )}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!cancelled) {
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }

    search();
    return () => {
      cancelled = true;
    };
  }, [input, ownerId]);

  const canShare = selectedTarget || isValidEmail(input);

  async function handleShare() {
    if (!canShare) {
      toast.error("Select a valid user or enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const targetPayload = selectedTarget
        ? {
            targetType: selectedTarget.type,
            targetId: selectedTarget._id,
          }
        : {
            email: input.trim(),
          };

      const res = await fetch(`/api/dashboard/${ownerId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          documentId,
          scope,
          ...targetPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Share failed");

      toast.success(
        data.type === "invite"
          ? `Invite sent to ${data.email}`
          : "Access granted"
      );

      resetInput();
      loadShares();
    } catch (e) {
      toast.error(e.message || "Failed to share");
    } finally {
      setLoading(false);
    }
  }

  async function revokeShare(id) {
    if (!confirm("Remove this person’s access?")) return;

    try {
      const res = await fetch(`/api/dashboard/${ownerId}/shares/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      // ✅ immediately update local state
      setShares((prev) => prev.filter((s) => s._id !== id));
      setInvites((prev) => prev.filter((i) => i._id !== id));

      toast.success("Access removed");
    } catch {
      toast.error("Failed to revoke");
    }
  }

  const nounSingle =
    documentType === "match-report" ? "match report" : "scouting report";
  const nounPlural =
    documentType === "match-report" ? "match reports" : "scouting reports";

  return (
    <ModalLayout
      isOpen={open}
      onClose={onClose}
      title="Share Report"
      withCard
    >
      <div className="space-y-6 text-gray-900 dark:text-gray-100">
        {/* INPUT */}
        <div className="space-y-2">
          <div className="font-medium">Share with</div>

          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setSelectedTarget(null);
            }}
            placeholder="Username or email"
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100"
          />

          {/* AUTOCOMPLETE */}
          {searchResults.length > 0 && !selectedTarget && (
            <div className="border border-gray-700 rounded-lg bg-gray-900 max-h-48 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r._id}
                  onClick={() => {
                    setSelectedTarget(r);
                    // show human name in the input (label), not username/email
                    setInput(displaySearchPrimary(r));
                    setSearchResults([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-800"
                >
                  <div className="font-medium text-gray-100">
                    {displaySearchPrimary(r)}
                  </div>
                  <div className="text-xs text-gray-300">
                    {displaySearchSecondary(r)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* If they picked a result, show a tiny "selected" hint */}
          {selectedTarget && (
            <div className="text-xs text-gray-300">
              Selected:{" "}
              <span className="font-medium text-gray-100">
                {displaySearchPrimary(selectedTarget)}
              </span>{" "}
              {selectedTarget?.username ? (
                <span className="text-gray-300">
                  (@{selectedTarget.username})
                </span>
              ) : null}
            </div>
          )}

          {searching && <div className="text-xs text-gray-300">Searching…</div>}
        </div>

        {/* SCOPE */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={scope === "one"}
              onChange={() => setScope("one")}
            />
            <span>This report only</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={scope === "all"}
              onChange={() => setScope("all")}
            />
            <span>All my {nounPlural}</span>
          </label>

          {scope === "all" && (
            <div className="mt-2 rounded-lg border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
              This gives the person access to{" "}
              <strong>every {nounSingle} you have now</strong> and{" "}
              <strong>any {nounPlural} you create in the future</strong>.
            </div>
          )}
        </div>

        {/* SHARE BUTTON */}
        <Button
          disabled={!canShare || loading}
          onClick={handleShare}
          className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white w-full"
        >
          {loading ? (
            <Spinner size={18} />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Share
        </Button>

        {/* CURRENT ACCESS */}
        <div className="space-y-3">
          <div className="font-medium">Currently shared with</div>

          {shares.length === 0 && invites.length === 0 ? (
            <p className="text-sm text-gray-900 dark:text-gray-100">
              No one has access yet.
            </p>
          ) : (
            <div className="space-y-2">
              {shares.map((s) => {
                const name = s.user
                  ? displayUserName(s.user)
                  : s.family
                  ? displayFamilyName(s.family)
                  : "Unknown";

                const sub = s.user?.username
                  ? `@${s.user.username}`
                  : s.family?.username
                  ? `@${s.family.username}`
                  : "";

                return (
                  <div
                    key={s._id}
                    className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-gray-100">{name}</div>
                      {sub ? (
                        <div className="text-xs text-gray-300">{sub}</div>
                      ) : null}
                      <div className="text-xs text-gray-300">
                        {s.scope === "all"
                          ? `All ${nounPlural}`
                          : `This ${nounSingle} only`}
                      </div>
                    </div>

                    <button
                      onClick={() => revokeShare(s._id)}
                      className="text-red-400 hover:text-red-300"
                      title="Remove access"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}

              {invites.map((i) => (
                <div
                  key={i._id}
                  className="flex items-center justify-between rounded-lg border border-dashed border-yellow-600 bg-gray-900 px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-gray-100">{i.email}</div>
                    <div className="text-xs text-gray-300">Invite pending</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalLayout>
  );
}

export default ShareReportModal;
