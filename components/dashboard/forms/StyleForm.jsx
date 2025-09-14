// components/dashboard/forms/StyleForm.jsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import Spinner from "@/components/shared/Spinner";

// Safe JSON parser
async function readJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

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
    startDate: "",
    grip: "",
    favoriteTechnique: "",
  });

  // Prefill
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
      startDate: toYMD(style.startDate ?? style.promotionDate),
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
      startDate: formData.startDate
        ? `${formData.startDate}T00:00:00.000Z`
        : undefined,
      // Removed: division, currentRank, weightClass
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
      data = await readJsonSafe(response);

      if (!response.ok) {
        toast.error(data?.error || data?.message || "Something went wrong.");
        return;
      }

      toast.success(data?.message || "Style saved!");
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
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
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
    </div>
  );
};

export default StyleForm;
