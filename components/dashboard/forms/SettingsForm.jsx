"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import useGeolocationCountry from "@/hooks/useGeolocationCountry";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function SettingsForm({ user, onClose }) {
  const router = useRouter();
  const isOAuthUser =
    user.provider === "facebook" || user.provider === "google";

  const getInitialFormData = () => ({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
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
  const { countryCode3 } = useGeolocationCountry();

  useEffect(() => {
    if (!user.country && countryCode3) {
      setFormData((prev) => ({ ...prev, country: countryCode3 }));
    }
  }, [user.country, countryCode3]);

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
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      gender: formData.gender,
      bMonth: formData.bMonth,
      bDay: formData.bDay,
      bYear: formData.bYear,
      allowPublic: formData.allowPublic ? "Public" : "Private",
      ...(formData.newPassword && { password: formData.newPassword }),
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text || "Unknown response format" };
      }

      if (response.ok) {
        toast.success(data.message || "User updated successfully");
        setTimeout(() => {
          router.refresh();
          onClose();
          setFormData(getInitialFormData());
        }, 1000);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (err) {
      toast.error(err.message || "Unexpected error");
      console.error(err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-background text-foreground p-6 rounded-lg shadow-lg"
    >
      {/* First & Last Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            disabled={isOAuthUser}
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

      {/* Email */}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          disabled={isOAuthUser}
        />
      </div>

      {/* Gender */}
      <div>
        <Label htmlFor="gender">Gender</Label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full rounded-md border px-3 py-2 text-sm bg-white text-foreground dark:bg-gray-900 dark:text-white"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>

      {/* Birthdate */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="bMonth">Birth Month</Label>
          <select
            id="bMonth"
            name="bMonth"
            value={formData.bMonth}
            onChange={handleChange}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Month</option>
            {[...Array(12)].map((_, i) => (
              <option
                key={i + 1}
                value={i + 1}
              >
                {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="bDay">Birth Day</Label>
          <select
            id="bDay"
            name="bDay"
            value={formData.bDay}
            onChange={handleChange}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Day</option>
            {[...Array(31)].map((_, i) => (
              <option
                key={i + 1}
                value={i + 1}
              >
                {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="bYear">Birth Year</Label>
          <select
            id="bYear"
            name="bYear"
            value={formData.bYear}
            onChange={handleChange}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Year</option>
            {Array.from({ length: 80 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="w-full rounded-md border px-3 py-2 text-sm bg-white text-foreground dark:bg-gray-900 dark:text-white"
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

      {/* Profile Visibility */}
      <div>
        <Label htmlFor="allowPublic">Make Profile Public</Label>
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            id="allowPublic"
            name="allowPublic"
            checked={formData.allowPublic}
            onChange={handleChange}
            className="mr-2"
          />
          <span className="text-sm text-muted-foreground">
            Your profile can be discovered by others.
          </span>
        </div>
      </div>

      {/* Optional Password */}
      {isOAuthUser && (
        <div>
          <Label htmlFor="newPassword">Set Password (Optional)</Label>
          <Input
            type="password"
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="Set a login password"
          />
        </div>
      )}

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
