// components/dashboard/forms/PromotionsForm.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

/* ---------------- helpers ---------------- */
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

function styleKeyFromStyleName(name) {
  const s = String(name || "").toLowerCase();
  if (s.includes("judo")) return "judo";
  if (s.includes("bjj") || s.includes("jiu")) return "bjj";
  return null;
}

const JUDO_KYU_LABELS = {
  white: "White Belt",
  yellow: "Yellow Belt (Gokyu / 5th Kyu)",
  orange: "Orange Belt (Yonkyu / 4th Kyu)",
  green: "Green Belt (Sankyu / 3rd Kyu)",
  blue: "Blue Belt (Nikyu / 2nd Kyu)",
  brown: "Brown Belt (Ikkyu / 1st Kyu)",
};
const JUDO_DAN_ROMAJI = {
  1: "Shodan",
  2: "Nidan",
  3: "Sandan",
  4: "Yondan",
  5: "Godan",
  6: "Rokudan",
  7: "Shichidan",
  8: "Hachidan",
  9: "Kudan",
  10: "Judan",
};
const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};
const titleCase = (w) =>
  String(w || "")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

function friendlyRankLabel(rank, styleKey) {
  if (rank?.label) return rank.label;

  const code = String(rank?.code || "").toLowerCase();
  if (!styleKey || !code) return rank?.code || "";

  if (styleKey === "judo") {
    if (JUDO_KYU_LABELS[code]) return JUDO_KYU_LABELS[code];
    if (code === "black") return "Black Belt";
    if (code.startsWith("black-")) {
      const n = parseInt(code.split("-")[1], 10);
      const romaji = JUDO_DAN_ROMAJI[n] || "";
      return `${ordinal(n)} Degree Black Belt${romaji ? ` (${romaji})` : ""}`;
    }
    return rank?.code || "";
  }

  if (styleKey === "bjj") {
    if (code === "black") return "Black Belt";
    if (code.startsWith("black-")) {
      const n = parseInt(code.split("-")[1], 10);
      return `${ordinal(n)} Degree Black Belt`;
    }
    return `${titleCase(code)} Belt`;
  }

  return rank?.code || "";
}

/* ---------------- child components ---------------- */
const AddPromotionInline = ({ userStyleId, onAdded, onClose, rankOptions }) => {
  const [form, setForm] = useState({
    rank: "",
    promotedOn: "",
    awardedBy: "",
    note: "",
    proofUrl: "",
  });
  const [saving, setSaving] = useState(false);

  const hasRankOptions = Array.isArray(rankOptions) && rankOptions.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!userStyleId) return;

    if (!form.rank) {
      toast.error("Please select a rank.");
      return;
    }
    if (!form.promotedOn) {
      toast.error("Please select a promotion date.");
      return;
    }

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
      // keep modal open to allow multiple adds
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

          {hasRankOptions ? (
            <select
              className="mt-1 w-full rounded border p-2 bg-background"
              value={form.rank}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  rank: e.target.value,
                }))
              }
              required
            >
              <option value="">Select rank…</option>
              {rankOptions.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="rank"
              className="mt-1 w-full rounded border p-2 bg-background"
              value={form.rank}
              onChange={(e) => setForm((s) => ({ ...s, rank: e.target.value }))}
              placeholder="e.g., Shodan / Brown"
              required
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Promotion Date</label>
          <input
            type="date"
            name="promotedOn"
            className="mt-1 w-full rounded border p-2 bg-background"
            value={form.promotedOn}
            onChange={(e) =>
              setForm((s) => ({ ...s, promotedOn: e.target.value }))
            }
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
            onChange={(e) =>
              setForm((s) => ({ ...s, awardedBy: e.target.value }))
            }
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
            onChange={(e) =>
              setForm((s) => ({ ...s, proofUrl: e.target.value }))
            }
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
          onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
        />
      </div>

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

export default function PromotionsForm({ userStyleId, onUpdated, onClose }) {
  const [loading, setLoading] = useState(false);
  const [styleDoc, setStyleDoc] = useState(null);
  const [allRanks, setAllRanks] = useState([]);

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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/ranks", { cache: "no-store" });
        const data = await readJsonSafe(res);
        if (alive) setAllRanks(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setAllRanks([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const styleKey = styleKeyFromStyleName(styleDoc?.styleName);
  const rankOptions = useMemo(() => {
    if (!styleKey) return [];
    const filtered = (allRanks || []).filter(
      (r) => String(r.style || "").toLowerCase() === styleKey
    );
    return filtered
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((r) => {
        const label = friendlyRankLabel(r, styleKey);
        return { value: label, label };
      });
  }, [allRanks, styleKey]);

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
          rankOptions={rankOptions}
        />
        {styleKey == null && (
          <p className="mt-2 text-xs text-muted-foreground">
            This style doesn’t have a standardized rank list yet. Enter the new
            rank manually.
          </p>
        )}
      </div>
    </div>
  );
}
