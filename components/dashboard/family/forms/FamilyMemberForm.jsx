"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";

export default function FamilyMemberForm({ user, onClose, onSuccess }) {
  const getInitialFormData = () => ({
    firstName: "",
    lastName: "",
    username: "",
    gender: "",
    allowPublic: false,
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [usernameStatus, setUsernameStatus] = useState(null);

  useEffect(() => {
    const checkUsername = async () => {
      if (!formData.username) return;
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${formData.username}`
        );
        const { available } = await res.json();
        setUsernameStatus(available ? "available" : "taken");
      } catch (err) {
        console.error("Username check failed", err);
      }
    };
    const timeoutId = setTimeout(checkUsername, 400);
    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { ...formData, userId: user._id };

    try {
      const res = await fetch(`/api/dashboard/${user._id}/family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Read raw text first to avoid "Unexpected end of JSON input"
        const text = await res.text();
        let msg = `Failed to add family member (HTTP ${res.status})`;
        try {
          const maybe = JSON.parse(text || "{}");
          if (maybe?.message) msg = maybe.message;
          if (maybe?.error) msg = maybe.error;
        } catch {
          if (text) msg = text;
        }
        console.error("❌ Server error:", text);
        toast.error(msg);
        return;
      }

      const data = await res.json();
      toast.success("Family member added successfully");
      onClose?.();
      onSuccess?.(data);
    } catch (err) {
      console.error("❗ Unexpected error:", err);
      toast.error("Unexpected error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* First & Last Name */}
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
      <div>
        <FormField
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
        />
        {usernameStatus === "taken" && (
          <p className="text-sm text-red-500 mt-1">Username is already taken</p>
        )}
        {usernameStatus === "available" && (
          <p className="text-sm text-green-500 mt-1">Username is available</p>
        )}
      </div>

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
          Make Profile Public
        </label>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          className="bg-ms-blue-gray hover:bg-ms-blue text-white"
        >
          Add Family Member
        </Button>
      </div>
    </form>
  );
}
