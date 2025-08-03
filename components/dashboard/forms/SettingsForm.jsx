"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import useGeolocationCountry from "@/hooks/useGeolocationCountry";
import { toast } from "react-toastify";

export default function SettingsForm({ user, onClose, refreshUser }) {
  const isOAuthUser =
    user.provider === "facebook" || user.provider === "google";

  const getInitialFormData = () => ({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    username: user.username || "",
    city: user.city || "",
    state: user.state || "",
    country: user.country || "",
    gender: user.gender || "",
    bMonth: user.bMonth || "",
    bDay: user.bDay || "",
    bYear: user.bYear || "",
    allowPublic: user.allowPublic === true || user.allowPublic === "Public",
    newPassword: "",
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [usernameStatus, setUsernameStatus] = useState(null);
  const { countryCode3 } = useGeolocationCountry();

  useEffect(() => {
    if (!user.country && countryCode3) {
      setFormData((prev) => ({ ...prev, country: countryCode3 }));
    }
  }, [user.country, countryCode3]);

  useEffect(() => {
    const checkUsername = async () => {
      if (!formData.username || formData.username === user.username) return;
      try {
        const res = await fetch(
          `/api/check-username?username=${formData.username}`
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
      allowPublic: formData.allowPublic ? "Public" : "Private",
      ...(formData.newPassword && { password: formData.newPassword }),
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (response.ok) {
        onClose();
        await refreshUser();
        toast.success(data.message || "User updated successfully");
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (err) {
      toast.error(err.message || "Unexpected error");
    }
  };

  return (
    <Card className="shadow-md card-dark">
      <CardHeader>
        <CardTitle>Edit Settings</CardTitle>
        <CardDescription>
          Update your personal profile details below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* First/Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block mb-1 font-medium"
                htmlFor="firstName"
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isOAuthUser}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background text-foreground"
              />
            </div>
            <div>
              <label
                className="block mb-1 font-medium"
                htmlFor="lastName"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isOAuthUser}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background text-foreground"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              className="block mb-1 font-medium"
              htmlFor="email"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isOAuthUser}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background text-foreground"
            />
          </div>

          {/* Username */}
          <div>
            <label
              className="block mb-1 font-medium"
              htmlFor="username"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background text-foreground"
            />
            {usernameStatus === "taken" && (
              <p className="text-sm text-red-500">Username is already taken</p>
            )}
            {usernameStatus === "available" && (
              <p className="text-sm text-green-500">Username is available</p>
            )}
          </div>

          {/* Location & Birthdate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                className="block mb-1 font-medium"
                htmlFor="city"
              >
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background text-foreground"
              />
            </div>
            <div>
              <label
                className="block mb-1 font-medium"
                htmlFor="state"
              >
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background text-foreground"
              />
            </div>
            <div>
              <label
                className="block mb-1 font-medium"
                htmlFor="country"
              >
                Country
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 dark:border-gray-700 bg-background text-foreground"
              >
                <option value="">Select country...</option>
                {Countries.map((country) => (
                  <option
                    key={country.code3}
                    value={country.code3}
                  >
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              className="block mb-1 font-medium"
              htmlFor="newPassword"
            >
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Leave blank to keep existing password"
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background text-foreground"
            />
          </div>

          {/* Checkbox */}
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
      </CardContent>
    </Card>
  );
}
