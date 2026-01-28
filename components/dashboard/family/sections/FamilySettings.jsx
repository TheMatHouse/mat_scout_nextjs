"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import Link from "next/link";
import { Copy, Share } from "lucide-react";

// Cloudinary delivery helper: inject f_auto,q_auto (+ optional transforms)
function cld(url, extra = "") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url; // skip non-Cloudinary URLs
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function FamilyMemberSettings({ member }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    gender: "",
    allowPublic: false,
    avatar: "",
  });

  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        username: member.username || "",
        gender: member.gender || "",
        allowPublic: member.allowPublic || false,
        avatar: member.avatar || "",
      });
    }
  }, [member]);

  // ✅ Fetch current user safely from API
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };

    fetchUser();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // quick client-side guardrails
    if (!ALLOWED.has(file.type)) {
      toast.error("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large. Max 5MB.");
      return;
    }

    setUploading(true);

    const form = new FormData();
    form.append("image", file);

    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/avatar`,
        {
          method: "PATCH",
          body: form,
        },
      );

      const data = await res.json();

      if (res.ok) {
        setFormData((prev) => ({
          ...prev,
          avatar: data.avatar || "", // expect a Cloudinary secure_url
        }));
        toast.success("Avatar updated!");
      } else {
        toast.error("Upload failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Avatar upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

      if (res.ok) {
        toast.success("Family member updated!");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update.");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Unexpected error");
    }
  };

  return (
    <div>
      {/* ✅ Show Public Profile link if this is the parent */}
      {currentUser && member && member.userId === currentUser._id && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-w-md shadow-md">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Your Public Profile
          </h3>

          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/family/${member.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
            >
              {`https://matscout.com/family/${member.username}`}
            </Link>

            <div className="flex items-center gap-3">
              {/* ✅ Copy Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://matscout.com/family/${member.username}`,
                  );
                  toast.success("Profile link copied!");
                }}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="Copy Link"
                aria-label="Copy profile link"
              >
                <Copy className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>

              {/* ✅ Share Button */}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "My Profile",
                      url: `https://matscout.com/family/${member.username}`,
                    });
                  } else {
                    toast.info("Sharing not supported on this device");
                  }
                }}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="Share"
                aria-label="Share profile link"
              >
                <Share className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-background text-foreground p-6 rounded-lg shadow-md border border-border"
      >
        {/* Avatar Upload */}
        <div>
          <label className="block font-medium mb-2">Avatar</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="w-full"
          />
          {uploading && <p className="text-sm mt-1">Uploading...</p>}
          {formData.avatar && (
            <Image
              src={cld(formData.avatar, "w_192,h_192,c_fill,g_auto,dpr_auto")}
              alt="Avatar"
              width={96}
              height={96}
              className="w-24 h-24 rounded-full mt-2 border object-cover"
              loading="lazy"
              sizes="96px"
            />
          )}
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
          />
          <FormField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>

        {/* Username */}
        <FormField
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
        />

        {/* Gender */}
        <FormSelect
          label="Gender"
          value={formData.gender}
          onChange={(val) => setFormData((prev) => ({ ...prev, gender: val }))}
          placeholder="Select gender..."
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "not specified", label: "Not specified" },
          ]}
        />

        {/* Public Profile Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowPublic"
            name="allowPublic"
            checked={formData.allowPublic}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label
            htmlFor="allowPublic"
            className="font-medium"
          >
            Make profile public
          </label>
        </div>

        {/* Submit */}
        <div className="pt-4">
          <Button
            type="submit"
            className="btn-submit"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
