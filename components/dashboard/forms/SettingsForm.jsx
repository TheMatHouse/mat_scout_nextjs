"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import useGeolocationCountry from "@/hooks/useGeolocationCountry";

import { toast } from "react-toastify";

export default function SettingsForm({ user, onClose, refreshUser }) {
  const isOAuthUser =
    user.provider === "facebook" || user.provider === "google";

  console.log("user ", user);
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
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      username: formData.username,
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
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}`,
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
        onClose();
        setTimeout(async () => {
          await refreshUser();
          toast.success(data.message || "User updated successfully");
        }, 300);
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
          {isOAuthUser && (
            <p className="text-sm text-muted-foreground">
              This name is managed by {user.provider}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            disabled={isOAuthUser}
          />
        </div>
      </div>

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
        {isOAuthUser && (
          <p className="text-sm text-muted-foreground">
            This email is managed by {user.provider}
          </p>
        )}
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="bMonth">Birth Month</Label>
          <Input
            type="number"
            id="bMonth"
            name="bMonth"
            value={formData.bMonth}
            onChange={handleChange}
            min="1"
            max="12"
          />
        </div>
        <div>
          <Label htmlFor="bDay">Birth Day</Label>
          <Input
            type="number"
            id="bDay"
            name="bDay"
            value={formData.bDay}
            onChange={handleChange}
            min="1"
            max="31"
          />
        </div>
        <div>
          <Label htmlFor="bYear">Birth Year</Label>
          <Input
            type="number"
            id="bYear"
            name="bYear"
            value={formData.bYear}
            onChange={handleChange}
            min="1900"
            max={new Date().getFullYear()}
          />
        </div>
      </div>

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
            className="w-full rounded-md border px-3 py-2"
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

      <div>
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          type="password"
          id="newPassword"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="Leave blank to keep existing password"
        />
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
          Save Changes
        </Button>
      </div>
    </form>
  );
}
