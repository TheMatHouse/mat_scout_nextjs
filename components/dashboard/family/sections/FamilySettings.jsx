"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";

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

    setUploading(true);

    const form = new FormData();
    form.append("image", file);

    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/avatar`,
        {
          method: "PATCH",
          body: form,
        }
      );

      const data = await res.json();

      if (res.ok) {
        setFormData((prev) => ({
          ...prev,
          avatar: data.avatar || "",
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
        }
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
          <img
            src={formData.avatar}
            alt="Avatar"
            className="w-24 h-24 rounded-full mt-2 border"
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
          className="btn btn-primary"
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
