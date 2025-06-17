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
import { useUser } from "@/context/UserContext";

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
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const utcDate = new Date(dateStr);
        return utcDate.toISOString().split("T")[0];
      };

      const formattedDate = formatDate(style.promotionDate);

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
        refreshUser(); // Will only refresh main user, not family member
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
              : "Add a style or sport. You can edit this later."}
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
              <Button type="submit">
                {style?._id ? "Update Style" : "Add Style"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AlertDialog>
  );
};

export default StyleForm;
