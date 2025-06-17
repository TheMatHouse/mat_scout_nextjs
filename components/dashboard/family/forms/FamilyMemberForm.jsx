"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import { toast } from "react-toastify";

export default function FamilyMemberForm({ user, onClose, onSuccess }) {
  const getInitialFormData = () => ({
    firstName: "",
    lastName: "",
    username: "",
    city: "",
    state: "",
    country: "",
    gender: "",
    bMonth: "",
    bDay: "",
    bYear: "",
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

    const payload = {
      ...formData,
      userId: user._id,
    };

    try {
      const res = await fetch(`/api/dashboard/${user._id}/family`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("✅ Parsed JSON:", data);
        toast.success("Family member added successfully");
        onClose();
        onSuccess(data);
      } else {
        // Read error once
        const errorData = await res.json();
        console.error("❌ Server error:", errorData);
        toast.error(errorData.message || "Failed to add family member");
      }
    } catch (err) {
      console.error("❗ Unexpected error:", err);
      toast.error("Unexpected error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-background text-foreground p-6 rounded-lg shadow-lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            type="text"
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
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
        />
        {usernameStatus === "taken" && (
          <p className="text-sm text-red-500">Username is already taken</p>
        )}
        {usernameStatus === "available" && (
          <p className="text-sm text-green-500">Username is available</p>
        )}
      </div>

      <div>
        <Label htmlFor="gender">Gender</Label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full rounded-md border px-3 py-2"
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
        <Label htmlFor="allowPublic">Make Profile Public</Label>
      </div>

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
