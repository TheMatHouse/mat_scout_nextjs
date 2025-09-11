// components/dashboard/forms/StyleForm.jsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import Spinner from "@/components/shared/Spinner";
import { format } from "date-fns";

const AddPromotionInline = ({ userStyleId, onAdded }) => {
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
            placeholder="e.g., Nidan / Brown"
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
};

const PromotionsList = ({ promotions = [] }) => {
  if (!promotions.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No promotions recorded yet.
      </div>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      {[...promotions].reverse().map((p, i) => (
        <li
          key={i}
          className="flex items-center justify-between"
        >
          <span className="font-medium">{p.rank}</span>
          <span className="text-muted-foreground">
            {p.promotedOn ? format(new Date(p.promotedOn), "LLL d, yyyy") : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
};

const StyleForm = ({
  user,
  style,
  userType = "user",
  member,
  setOpen,
  onSuccess,
}) => {
  const { refreshUser } = useUser();

  const [availableStyles, setAvailableStyles] = useState([]);
  const [stylesLoaded, setStylesLoaded] = useState(false);

  const [formData, setFormData] = useState({
    styleName: "",
    currentRank: "",
    startDate: "",
    division: "",
    weightClass: "",
    grip: "",
    favoriteTechnique: "",
  });

  // Prefill (supports legacy rank/promotionDate)
  useEffect(() => {
    if (!style) return;
    const toYMD = (d) => {
      if (!d) return "";
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return "";
      return dt.toISOString().split("T")[0];
    };
    setFormData((prev) => ({
      ...prev,
      styleName: style.styleName || "",
      currentRank: style.currentRank ?? style.rank ?? "",
      startDate: toYMD(style.startDate ?? style.promotionDate),
      division: style.division || "",
      weightClass: style.weightClass || "",
      grip: style.grip || "",
      favoriteTechnique: style.favoriteTechnique || "",
    }));
  }, [style]);

  // Fetch style options
  useEffect(() => {
    let alive = true;
    (async () => {
      setStylesLoaded(false);
      try {
        const res = await fetch("/api/styles", { cache: "no-store" });
        const data = await res.json();
        if (alive && Array.isArray(data)) {
          setAvailableStyles(data);
        }
      } catch (e) {
        console.error("Error fetching styles:", e);
      } finally {
        alive && setStylesLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const styleOptions = (() => {
    const list = Array.isArray(availableStyles) ? availableStyles : [];
    const names = new Set(list.map((s) => s.styleName));
    if (formData.styleName && !names.has(formData.styleName)) {
      return [{ styleName: formData.styleName }, ...list];
    }
    return list;
  })();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (userType === "family" && (!member?._id || !member?.userId)) {
      toast.error("Missing family member info");
      return;
    }

    const payload = {
      styleName: formData.styleName,
      currentRank: formData.currentRank || undefined,
      startDate: formData.startDate
        ? `${formData.startDate}T00:00:00.000Z`
        : undefined,
      division: formData.division || undefined,
      weightClass: formData.weightClass || undefined,
      grip: formData.grip || undefined,
      favoriteTechnique: formData.favoriteTechnique || undefined,
      ...(userType === "family" ? { familyMemberId: member._id } : {}),
    };

    try {
      let response, data;
      if (style?._id) {
        response = await fetch(`/api/userStyles/${style._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`/api/userStyles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      data = await response.json();

      if (!response.ok) {
        toast.error(data.error || data.message || "Something went wrong.");
        return;
      }

      toast.success(data.message || "Style saved!");
      await refreshUser();
      onSuccess?.(data.updatedStyle || data.createdStyle || data.style || {});
      setOpen?.(false);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Error saving style.");
    }
  };

  if (!stylesLoaded) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-xl flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Spinner size={28} />
          <span className="text-sm text-muted-foreground">Loading styles…</span>
        </div>
      </div>
    );
  }

  const isEdit = Boolean(style?._id);

  return (
    <div className="space-y-6">
      {/* Base style form */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xl">
        <form
          onSubmit={submit}
          className="space-y-6"
          aria-busy={!stylesLoaded}
        >
          <FormSelect
            label="Style/Sport"
            value={formData.styleName}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, styleName: val }))
            }
            placeholder="Select Style/Sport"
            options={styleOptions.map((s) => ({
              value: s.styleName,
              label: s.styleName,
            }))}
            required
          />

          <FormField
            label="Current Rank"
            name="currentRank"
            value={formData.currentRank}
            onChange={handleChange}
            placeholder="e.g., Shodan / Purple"
          />

          <FormField
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
          />

          <FormField
            label="Division"
            name="division"
            value={formData.division}
            onChange={handleChange}
            placeholder="Division"
          />

          <FormField
            label="Weight Class"
            name="weightClass"
            value={formData.weightClass}
            onChange={handleChange}
            placeholder="Weight Class"
          />

          <div>
            <label className="block text-sm font-medium mb-2">
              Grip/Stance
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="grip"
                  value="righty"
                  checked={formData.grip === "righty"}
                  onChange={handleChange}
                />
                Righty
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="grip"
                  value="lefty"
                  checked={formData.grip === "lefty"}
                  onChange={handleChange}
                />
                Lefty
              </label>
            </div>
          </div>

          <FormField
            label="Favorite Technique"
            name="favoriteTechnique"
            value={formData.favoriteTechnique}
            onChange={handleChange}
            placeholder="Favorite Technique"
          />

          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              className="btn btn-primary"
            >
              {isEdit ? "Update Style" : "Add Style"}
            </Button>
          </div>
        </form>
      </div>

      {/* Promotions block (only in edit mode) */}
      {isEdit && (
        <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xl">
          <div className="mb-4 space-y-1">
            <div className="text-sm text-muted-foreground">
              Current Rank:{" "}
              <span className="font-medium text-foreground">
                {style.currentRank || "—"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Started:{" "}
              <span className="font-medium text-foreground">
                {style.startDate
                  ? format(new Date(style.startDate), "LLL yyyy")
                  : "—"}
              </span>
            </div>
          </div>

          <h4 className="text-base font-semibold mb-2">Promotion History</h4>
          <PromotionsList promotions={style.promotions || []} />

          <div className="mt-5">
            <h4 className="text-base font-semibold mb-2">Add Promotion</h4>
            <AddPromotionInline
              userStyleId={style._id}
              onAdded={(updated) => {
                // Keep the parent state in sync
                onSuccess?.(updated);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleForm;
