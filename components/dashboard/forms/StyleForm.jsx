"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";

import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const StyleForm = ({ user, style, userType, type, setOpen, onSuccess }) => {
  const router = useRouter();
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

  useEffect(() => {
    if (style) {
      console.log("Style object received:", style);
      console.log("Raw promotionDate:", style.promotionDate);
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const utcDate = new Date(dateStr);
        return utcDate.toISOString().split("T")[0]; // Use raw UTC date
      };

      console.log("Raw promotionDate:", style.promotionDate);
      const formattedDate = formatDate(style.promotionDate);
      console.log("Formatted promotionDate:", formattedDate);

      setFormData({
        styleName: style.styleName || "",
        rank: style.rank || "",
        division: style.division || "",
        weightClass: style.weightClass || "",
        grip: style.grip || "",
        favoriteTechnique: style.favoriteTechnique || "",
        promotionDate: formattedDate,
      });
    }
  }, [style]);

  useEffect(() => {
    console.log("Final formData state:", formData);
  }, [formData]);
  const isLoading = false;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ensure promotionDate is correctly converted to midnight UTC
    const adjustedFormData = {
      ...formData,
      promotionDate: formData.promotionDate
        ? `${formData.promotionDate}T00:00:00.000Z`
        : undefined,
    };

    try {
      const method = style ? "PATCH" : "POST";
      const endpoint = style
        ? `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/userStyles/${style._id}`
        : `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/userStyles`;

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
    <AlertDialog>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Style/Sport</CardTitle>
          <CardDescription>
            {style?._id
              ? `Update ${style?.styleName} style information`
              : "Add a user style. You can edit this later from the dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="block text-sm font-medium">Style/Sport</label>
              <select
                className="w-full p-2 border rounded"
                value={formData.styleName}
                onChange={(e) =>
                  setFormData({ ...formData, styleName: e.target.value })
                }
              >
                <option value="">Select Style/Sport</option>
                {availableStyles.map((style) => (
                  <option
                    key={style._id}
                    value={style.styleName}
                  >
                    {style.styleName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Rank</label>
              <Input
                placeholder="Rank"
                value={formData.rank}
                onChange={(e) =>
                  setFormData({ ...formData, rank: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Promotion Date
              </label>
              <Input
                type="date"
                value={formData.promotionDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    promotionDate: e.target.value,
                  })
                }
              />
              {/* Debug line to ensure date is correct */}
              <p className="text-xs text-gray-500">
                Current date value: {formData.promotionDate}
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Division</label>
              <Input
                placeholder="Division"
                value={formData.division}
                onChange={(e) =>
                  setFormData({ ...formData, division: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Weight Class</label>
              <Input
                placeholder="Weight Class"
                value={formData.weightClass}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weightClass: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Grip/Stance</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    value="righty"
                    checked={formData.grip === "righty"}
                    onChange={(e) =>
                      setFormData({ ...formData, grip: e.target.value })
                    }
                  />
                  Righty
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    value="lefty"
                    checked={formData.grip === "lefty"}
                    onChange={(e) =>
                      setFormData({ ...formData, grip: e.target.value })
                    }
                  />
                  Lefty
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Favorite Technique
              </label>
              <Input
                placeholder="Favorite Technique"
                value={formData.favoriteTechnique}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    favoriteTechnique: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading
                  ? "Saving..."
                  : style?._id
                  ? "Update Style"
                  : "Add Style"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AlertDialog>
  );
};

export default StyleForm;
