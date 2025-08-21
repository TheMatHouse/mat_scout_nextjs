"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";

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

  const [formData, setFormData] = useState({
    styleName: "",
    rank: "",
    division: "",
    weightClass: "",
    grip: "",
    favoriteTechnique: "",
    promotionDate: "",
  });

  // Fetch available styles
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const res = await fetch(`/api/styles`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setAvailableStyles(data);
        } else {
          console.error("Fetched styles is not an array", data);
        }
      } catch (err) {
        console.error("Error fetching styles:", err);
      }
    };

    fetchStyles();
  }, []);

  console.log(availableStyles);
  // Populate form if editing existing style
  useEffect(() => {
    if (style) {
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const utcDate = new Date(dateStr);
        return utcDate.toISOString().split("T")[0];
      };

      setFormData({
        styleName: style.styleName || "",
        rank: style.rank || "",
        division: style.division || "",
        weightClass: style.weightClass || "",
        grip: style.grip || "",
        favoriteTechnique: style.favoriteTechnique || "",
        promotionDate: formatDate(style.promotionDate),
      });
    }
  }, [style]);

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
    let method = style ? "PATCH" : "POST";

    if (userType === "user") {
      adjustedFormData.userId = user._id;
      endpoint = style
        ? `/api/dashboard/${user._id}/userStyles/${style._id}`
        : `/api/dashboard/${user._id}/userStyles`;
    } else if (userType === "family") {
      adjustedFormData.userId = member.userId;
      adjustedFormData.familyMemberId = member._id;
      endpoint = style
        ? `/api/dashboard/${member.userId}/family/${member._id}/styles/${style._id}`
        : `/api/dashboard/${member.userId}/family/${member._id}/styles`;
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adjustedFormData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Style saved!");
        refreshUser();
        setTimeout(() => {
          onSuccess?.(data.updatedStyle || data.createdStyle || {});
          setOpen?.(false);
        }, 300);
      } else {
        toast.error(data.message || "Something went wrong.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Error saving style.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <FormSelect
        label="Style/Sport"
        value={formData.styleName}
        onChange={(val) => setFormData((prev) => ({ ...prev, styleName: val }))}
        placeholder="Select Style/Sport"
        options={availableStyles.map((s) => ({
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

      {/* Grip/Stance */}
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
  );
};

export default StyleForm;
