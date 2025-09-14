// components/dashboard/forms/PromotionsForm.jsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

// Safe JSON parser
async function readJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function SpinnerInline() {
  return <div className="text-sm text-muted-foreground">Loading…</div>;
}

const AddPromotionInline = ({ userStyleId, onAdded, onClose }) => {
  const [form, setForm] = useState({
    rank: "",
    promotedOn: "",
    awardedBy: "",
    note: "",
    proofUrl: "",
  });
  const [saving, setSaving] = useState(false);

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!userStyleId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/userStyles/${userStyleId}/promotions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await readJsonSafe(res);
      if (!res.ok || !json?.style) {
        throw new Error(json?.error || "Failed to add promotion");
      }
      toast.success("Promotion added");
      onAdded?.(json.style);
      setForm({
        rank: "",
        promotedOn: "",
        awardedBy: "",
        note: "",
        proofUrl: "",
      });
    } catch (err) {
      toast.error(err.message || "Error adding promotion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">New Rank</label>
          <input
            name="rank"
            className="mt-1 w-full rounded border p-2 bg-background"
            value={form.rank}
            onChange={onChange}
            placeholder="e.g., Shodan / Brown"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Promotion Date</label>
          <input
            type="date"
            name="promotedOn"
            className="mt-1 w-full rounded border p-2 bg-background"
            value={form.promotedOn}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">
            Awarded By (optional)
          </label>
          <input
            name="awardedBy"
            className="mt-1 w-full rounded border p-2 bg-background"
            value={form.awardedBy}
            onChange={onChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            Proof URL (optional)
          </label>
          <input
            name="proofUrl"
            className="mt-1 w-full rounded border p-2 bg-background"
            value={form.proofUrl}
            onChange={onChange}
            placeholder="https://..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Note (optional)</label>
        <input
          name="note"
          className="mt-1 w-full rounded border p-2 bg-background"
          value={form.note}
          onChange={onChange}
        />
      </div>

      {/* Action row: Centered, Add Promotion left, Close right */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="btn btn-primary min-w-[140px]"
        >
          {saving ? "Adding…" : "Add Promotion"}
        </Button>
        {onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="min-w-[96px]"
          >
            Close
          </Button>
        )}
      </div>
    </form>
  );
};

const PromotionsList = ({ userStyleId, promotions = [], onDeleted }) => {
  const [busyKey, setBusyKey] = useState(null);

  const handleDelete = async (p) => {
    if (!userStyleId) return;
    if (!window.confirm("Delete this promotion?")) return;

    const qs = new URLSearchParams();
    let key;

    if (p._id) {
      qs.set("promotionId", String(p._id));
      key = `id:${p._id}`;
    } else {
      if (!p.rank || !p.promotedOn) {
        toast.error("Cannot identify this promotion to delete.");
        return;
      }
      const iso = new Date(p.promotedOn).toISOString();
      qs.set("rank", p.rank);
      qs.set("promotedOn", iso);
      key = `rp:${p.rank}|${iso}`;
    }

    setBusyKey(key);
    try {
      const url = p._id
        ? `/api/userStyles/${userStyleId}/promotions/${p._id}`
        : `/api/userStyles/${userStyleId}/promotions?${qs.toString()}`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await readJsonSafe(res);
      if (!res.ok || !json?.style)
        throw new Error(json?.error || "Failed to delete promotion");
      toast.success("Promotion deleted");
      onDeleted?.(json.style);
    } catch (err) {
      toast.error(err.message || "Error deleting promotion");
    } finally {
      setBusyKey(null);
    }
  };

  // Sort oldest → newest
  const sortedPromotions = [...promotions].sort((a, b) => {
    const da = a.promotedOn ? new Date(a.promotedOn).getTime() : 0;
    const db = b.promotedOn ? new Date(b.promotedOn).getTime() : 0;
    return da - db;
  });

  if (!sortedPromotions.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No promotions recorded yet.
      </div>
    );
  }

  return (
    <ul className="space-y-1 text-sm">
      {sortedPromotions.map((p) => {
        const iso = p.promotedOn ? new Date(p.promotedOn).toISOString() : "";
        const key = p._id ? `id:${p._id}` : `rp:${p.rank}|${iso}`;
        const isBusy = busyKey === key;
        return (
          <li
            key={key}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{p.rank}</span>
              <span className="text-muted-foreground">
                {p.promotedOn
                  ? format(new Date(p.promotedOn), "LLL d, yyyy")
                  : "—"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(p)}
              disabled={isBusy}
              className="px-2 py-1 rounded border border-red-400 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-xs"
              aria-label="Delete promotion"
              title="Delete promotion"
            >
              {isBusy ? "Deleting…" : "Delete"}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * PromotionsForm
 * Props:
 * - userStyleId: string (required)
 * - onUpdated: (updatedStyle) => void
 * - onClose: () => void
 */
export default function PromotionsForm({ userStyleId, onUpdated, onClose }) {
  const [loading, setLoading] = useState(false);
  const [styleDoc, setStyleDoc] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!userStyleId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/userStyles/${userStyleId}`, {
          cache: "no-store",
        });
        const json = await readJsonSafe(res);
        if (!res.ok || !json)
          throw new Error(json?.error || "Failed to load style");
        const doc = json?.style || json;
        if (alive) setStyleDoc(doc);
      } catch (e) {
        console.error(e);
        if (alive) setStyleDoc(null);
      } finally {
        alive && setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [userStyleId]);

  const handleUpdated = (updated) => {
    setStyleDoc(updated);
    onUpdated?.(updated);
  };

  if (!userStyleId) {
    return (
      <div className="text-sm text-muted-foreground">
        Select a style to manage promotions.
      </div>
    );
  }

  if (loading) return <SpinnerInline />;
  if (!styleDoc)
    return (
      <div className="text-sm text-red-500">
        Could not load the selected style.
      </div>
    );

  const startedText = styleDoc.startDate
    ? format(new Date(styleDoc.startDate), "LLL yyyy")
    : "—";

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h4 className="text-base font-semibold">
          {styleDoc.styleName} – Promotions
        </h4>
        <p className="text-xs text-muted-foreground">
          Add or delete promotions below. Your current rank updates based on the
          most recent promotion.
        </p>
      </div>

      <div className="mb-4 space-y-1">
        <div className="text-sm text-muted-foreground">
          Current Rank:{" "}
          <span className="font-medium text-foreground">
            {styleDoc.currentRank || "—"}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Started:{" "}
          <span className="font-medium text-foreground">{startedText}</span>
        </div>
      </div>

      <h4 className="text-base font-semibold">Promotion History</h4>
      <PromotionsList
        userStyleId={userStyleId}
        promotions={styleDoc.promotions || []}
        onDeleted={handleUpdated}
      />

      <div className="mt-5">
        <AddPromotionInline
          userStyleId={userStyleId}
          onAdded={handleUpdated}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
