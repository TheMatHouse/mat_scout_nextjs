// components/teams/[slug]/settings/TransferOwnershipContent.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

/**
 * Content-only body to embed inside <ModalLayout>.
 * No overlay/portal here—ModalLayout handles that.
 */
function TransferOwnershipContent({ slug, onComplete, onClose }) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [myNewRole, setMyNewRole] = useState("member");

  useEffect(() => {
    void fetchManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function fetchManagers() {
    try {
      setLoading(true);
      const res = await fetch(`/api/teams/${slug}/managers`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Failed to load managers");
      setManagers(data.managers || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not load managers");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = useMemo(() => {
    return !!selectedManagerId && !!myNewRole && !loading;
  }, [selectedManagerId, myNewRole, loading]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!canSubmit) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/teams/${slug}/transfer-owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newOwnerUserId: selectedManagerId,
          myNewRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Transfer failed");

      toast.success("Ownership transferred");
      onComplete?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not transfer ownership");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
          Select the new owner (must be a current manager)
        </label>
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-800 max-h-64 overflow-y-auto">
          {loading && (
            <div className="p-3 text-sm text-gray-900 dark:text-gray-100">
              Loading managers…
            </div>
          )}
          {!loading && managers.length === 0 && (
            <div className="p-3 text-sm text-gray-900 dark:text-gray-100">
              No managers found. Invite someone as a manager first.
            </div>
          )}
          {!loading &&
            managers.map((m) => {
              const checked = selectedManagerId === String(m.userId);
              return (
                <label
                  key={String(m.userId)}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <input
                    type="radio"
                    name="newOwner"
                    className="h-4 w-4"
                    checked={checked}
                    onChange={() => setSelectedManagerId(String(m.userId))}
                  />
                  <div className="flex items-center gap-3">
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-neutral-700" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {m.name}
                      </div>
                      <div className="text-xs text-gray-900 dark:text-gray-100">
                        {m.email}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
          Your new role after transfer
        </label>
        <select
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 p-2 text-gray-900 dark:text-gray-100"
          value={myNewRole}
          onChange={(e) => setMyNewRole(e.target.value)}
        >
          <option value="member">Member</option>
          <option value="coach">Coach</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-submit"
        >
          {loading ? "Transferring…" : "Transfer Ownership"}
        </button>
      </div>
    </form>
  );
}

export default TransferOwnershipContent;
