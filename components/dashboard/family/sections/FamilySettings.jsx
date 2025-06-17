"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

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
        console.error("Cloudinary error:", data);
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
      className="space-y-8 bg-background text-foreground p-6 rounded-lg shadow-md border border-border"
    >
      {/* Avatar Upload */}
      <div>
        <Label htmlFor="avatar">Avatar</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
        />
      </div>

      <div>
        <Label htmlFor="gender">Gender</Label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full rounded-md border px-3 py-2 dark:bg-black dark:text-white"
        >
          <option value="">Select gender...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="not specified">Not specified</option>
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="allowPublic"
          name="allowPublic"
          checked={formData.allowPublic}
          onChange={handleChange}
          className="mr-2"
        />
        <Label htmlFor="allowPublic">Make profile public</Label>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          className="bg-ms-blue-gray hover:bg-ms-blue text-white"
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
