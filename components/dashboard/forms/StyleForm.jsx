// components/dashboard/forms/StyleForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import Spinner from "@/components/shared/Spinner";

const StyleForm = ({
  user,
  style,
  userType = "user",
  member,
  setOpen,
  onSuccess,
}) => {
  const router = useRouter();
  const { refreshUser } = useUser();

  const [availableStyles, setAvailableStyles] = useState([]);
  const [stylesLoaded, setStylesLoaded] = useState(false);

  const [formData, setFormData] = useState({
    styleName: "",
    rank: "",
    division: "",
    weightClass: "",
    grip: "",
    favoriteTechnique: "",
    promotionDate: "",
  });

  // Pre-fill when editing
  useEffect(() => {
    if (!style) return;
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toISOString().split("T")[0];
    };
    setFormData((prev) => ({
      ...prev,
      styleName: style.styleName || "",
      rank: style.rank || "",
      division: style.division || "",
      weightClass: style.weightClass || "",
      grip: style.grip || "",
      favoriteTechnique: style.favoriteTechnique || "",
      promotionDate: formatDate(style.promotionDate),
    }));
  }, [style]);

  // Fetch style options; gate the entire form until loaded
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

  // Build options and ensure the current value is present even if the API
  // hasn’t returned it yet (edge cases / race conditions).
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (userType === "family" && (!member?._id || !member?.userId)) {
      toast.error("Missing family member info");
      return;
    }

    const adjustedFormData = {
      ...formData,
      promotionDate: formData.promotionDate
        ? `${formData.promotionDate}T00:00:00.000Z`
        : undefined,
    };

    let endpoint = "";
    const method = style ? "PATCH" : "POST";

    if (userType === "user") {
      adjustedFormData.userId = user._id;
      endpoint = style
        ? `/api/dashboard/${user._id}/userStyles/${style._id}`
        : `/api/dashboard/${user._id}/userStyles`;
    } else {
      adjustedFormData.userId = member.userId;
      adjustedFormData.familyMemberId = member._id;
      endpoint = style
        ? `/api/dashboard/${member.userId}/family/${member._id}/styles/${style._id}`
        : `/api/dashboard/${member.userId}/family/${member._id}/styles`;
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjustedFormData),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Something went wrong.");
        return;
      }

      toast.success(data.message || "Style saved!");
      await refreshUser();
      onSuccess?.(data.updatedStyle || data.createdStyle || {});
      setOpen?.(false);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Error saving style.");
    }
  };

  // Gate the whole form UI until styles have loaded
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

  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xl">
      <form
        onSubmit={handleSubmit}
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
          label="Rank"
          name="rank"
          value={formData.rank}
          onChange={handleChange}
          placeholder="Rank"
        />

        <FormField
          label="Promotion Date"
          name="promotionDate"
          type="date"
          value={formData.promotionDate}
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
          <label className="block text-sm font-medium mb-2">Grip/Stance</label>
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
            {style?._id ? "Update Style" : "Add Style"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StyleForm;
