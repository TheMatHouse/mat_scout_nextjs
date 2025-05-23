// components/dashboard/forms/SettingsForm.jsx
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

  const getInitialFormData = () => ({
    city: user.city || "",
    state: user.state || "",
    country: user.country || "",
    allowPublic: user.allowPublic === true || user.allowPublic === "Public",
  });

  const [formData, setFormData] = useState(getInitialFormData());

  const { countryCode3, loading } = useGeolocationCountry();

  useEffect(() => {
    if (!user.country && countryCode3) {
      setFormData((prev) => ({ ...prev, country: countryCode3 }));
    }
  }, [user.country, countryCode3]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleToggle = () => {
    setFormData((prev) => ({
      ...prev,
      allowPublic: !prev.allowPublic,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      city: formData.city,
      state: formData.state,
      country: formData.country,
      allowPublic: formData.allowPublic ? "Public" : "Private",
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/`,
        {
          method: "PATCH", // Make sure you're using PATCH, not POST
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      let data = null;
      const text = await response.text(); // Get raw response
      try {
        data = JSON.parse(text); // Try parsing it
      } catch {
        data = { message: text || "Unknown response format" };
      }

      if (response.ok) {
        toast.success(data.message || "User updated successfully", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
        });

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <Label
            htmlFor="city"
            className="text-base font-medium"
          >
            City
          </Label>
          <Input
            type="text"
            name="city"
            id="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
          />
        </div>
        <div>
          <Label
            htmlFor="state"
            className="text-base font-medium"
          >
            State
          </Label>
          <Input
            type="text"
            name="state"
            id="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="State"
          />
        </div>
        <div>
          <Label
            htmlFor="country"
            className="text-base font-medium"
          >
            Country
          </Label>
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

      <div className="mt-6">
        <Label
          htmlFor="allowPublic"
          className="text-base font-medium"
        >
          Make Profile Public
        </Label>
        <div className="flex items-center space-x-4 mt-2">
          <label className="switch">
            <input
              type="checkbox"
              id="allowPublic"
              name="allowPublic"
              checked={formData.allowPublic}
              onChange={handleToggle}
            />
            <span className="slider round"></span>
          </label>
          <span className="text-sm text-muted-foreground">
            Your profile can be discovered by others.
          </span>
        </div>
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
