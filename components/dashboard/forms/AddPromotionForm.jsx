"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";

export default function AddPromotionForm({ userStyleId, onAdded }) {
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
      const json = await res.json();
      if (!res.ok || !json?.style)
        throw new Error(json?.error || "Failed to add promotion");
      toast.success("Promotion added");
      onAdded?.(json.style); // send back updated style
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
            placeholder="e.g., Nidan / Purple"
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

      <Button
        type="submit"
        disabled={saving}
        className="btn btn-primary"
      >
        {saving ? "Adding..." : "Add Promotion"}
      </Button>
    </form>
  );
}
