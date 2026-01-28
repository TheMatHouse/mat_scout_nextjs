// components/dashboard/forms/SettingsForm.jsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import Countries from "@/assets/countries.json";
import useGeolocationCountry from "@/hooks/useGeolocationCountry";

import PasswordInput from "@/components/shared/PasswordInput";

// ✅ same helpers used on registration
import { sanitizeUsername, isUsernameFormatValid } from "@/lib/identifiers";

export default function SettingsForm({ user, onClose, refreshUser }) {
  const isOAuthUser =
    user.provider === "facebook" || user.provider === "google";

  // —————————————————————————————————————————————————————
  // React Hook Form setup (mirrors Registration usage)
  // —————————————————————————————————————————————————————
  const form = useForm({
    mode: "onChange",
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      username: user.username || "",
      city: user.city || "",
      state: user.state || "",
      country: user.country === "not specified" ? "" : user.country || "",
      gender: user.gender === "not specified" ? "" : user.gender || "",
      bMonth: user.bMonth || "",
      bDay: user.bDay || "",
      bYear: user.bYear || "",
      allowPublic: user.allowPublic === true || user.allowPublic === "Public",
      newPassword: "",
    },
  });

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { isSubmitting },
    watch,
  } = form;

  const currentUsername = user?.username || "";
  const { countryCode3 } = useGeolocationCountry();

  // —————————————————————————————————————————————————————
  // Prefill country from geolocation if user has none
  // —————————————————————————————————————————————————————
  useEffect(() => {
    if (!user.country && countryCode3) {
      setValue("country", countryCode3, { shouldDirty: true });
    }
  }, [user.country, countryCode3, setValue]);

  // —————————————————————————————————————————————————————
  // Username: sanitize while typing (like before)
  // —————————————————————————————————————————————————————
  const usernameValue = watch("username");

  // Apply sanitization on change (we’ll perform it inside render to keep input responsive)

  // —————————————————————————————————————————————————————
  // Debounced username availability check
  // —————————————————————————————————————————————————————
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // "available" | "taken" | null
  const abortRef = useRef(null);
  useEffect(() => {
    const raw = (usernameValue || "").trim();

    // If empty or unchanged, clear status & errors
    if (!raw || raw === currentUsername) {
      setUsernameStatus(null);
      clearErrors("username");
      return;
    }

    // If invalid format, don't ping the server; let validation show
    if (!isUsernameFormatValid(raw)) {
      setUsernameStatus(null);
      return;
    }

    // Debounce network call
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const url = `/api/check-username?username=${encodeURIComponent(raw)}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { accept: "application/json" },
          cache: "no-store",
        });

        const text = await res.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (res.ok && data && typeof data.available === "boolean") {
          if (data.available) {
            setUsernameStatus("available");
            clearErrors("username");
          } else {
            setUsernameStatus("taken");
            setError("username", {
              type: "manual",
              message: "That username is already taken.",
            });
          }
        } else {
          setUsernameStatus(null);
        }
      } catch {
        setUsernameStatus(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 450);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameValue]);

  // —————————————————————————————————————————————————————
  // Prevent invalid keystrokes in username
  // —————————————————————————————————————————————————————
  const preventBadUsernameInput = (e) => {
    if (!e.data) return;
    if (!/^[a-zA-Z0-9_-]$/.test(e.data)) e.preventDefault();
  };

  // —————————————————————————————————————————————————————
  // Submit
  // —————————————————————————————————————————————————————
  const onSubmit = async (data) => {
    // Final validation parity with your previous logic
    const u = (data.username || "").trim();
    if (u && !isUsernameFormatValid(u)) {
      setError("username", {
        type: "validate",
        message: "Username must be 3–30 chars (a–z, 0–9, - or _).",
      });
      return;
    }

    const payload = {
      ...data,
      allowPublic: data.allowPublic ? "Public" : "Private",
      ...(data.newPassword ? { password: data.newPassword } : {}),
    };

    try {
      const response = await fetch(`/api/dashboard/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      if (response.ok) {
        onClose?.();
        await refreshUser?.();
        toast.success(json?.message || "User updated successfully");
        // Clear password field after save
        setValue("newPassword", "");
      } else {
        toast.error(json?.message || "Something went wrong");
      }
    } catch (err) {
      toast.error(err?.message || "Unexpected error");
    }
  };

  // —————————————————————————————————————————————————————
  // UI
  // —————————————————————————————————————————————————————
  const isUsernameInvalid =
    !!usernameValue && !isUsernameFormatValid(usernameValue);

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* First/Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isOAuthUser}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isOAuthUser}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Email */}
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  disabled={isOAuthUser}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Username + availability */}
        <FormField
          control={control}
          name="username"
          rules={{
            validate: (val) =>
              !val ||
              isUsernameFormatValid(val) ||
              "Use 3–30 chars: a–z, 0–9, hyphen or underscore",
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onBeforeInput={preventBadUsernameInput}
                  // sanitize as user types
                  onChange={(e) => {
                    const clean = sanitizeUsername(e.target.value);
                    field.onChange(clean);
                  }}
                  placeholder="Username"
                  autoComplete="username"
                />
              </FormControl>
              {/* Inline availability / validation messages */}
              <div className="mt-1 text-sm">
                {field.value ? (
                  isUsernameInvalid ? (
                    <span className="text-red-600">
                      Use 3–30 chars: a–z, 0–9, hyphen or underscore
                    </span>
                  ) : field.value === currentUsername ? (
                    <span className="text-gray-500">Current username</span>
                  ) : checkingUsername ? (
                    <span className="text-gray-500">Checking…</span>
                  ) : usernameStatus === null ? (
                    <span className="text-gray-500">—</span>
                  ) : usernameStatus === "available" ? (
                    <span className="text-green-600">✓ Available</span>
                  ) : (
                    <span className="text-red-600">✕ Taken</span>
                  )
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gender (using Controller because it's a custom select) */}
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <FormControl>
                {/* Replace with your own select if you have one; here we keep a simple native select for clarity */}
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <option value="">Select Gender...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="City"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="State"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  {/* Using a native select to keep things simple; swap for your FormSelect if desired */}
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">Select Country...</option>
                    {Countries.map((c) => (
                      <option
                        key={c.code3}
                        value={c.code3}
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Password (RHF + shadcn like Registration) */}
        <FormField
          control={control}
          name="newPassword"
          rules={{
            // Not required—blank keeps existing password
            validate: (val) =>
              !val || val.length >= 6 || "At least 6 characters",
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <PasswordInput
                  {...field}
                  placeholder="Leave blank to keep existing password"
                  autoComplete="new-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Public checkbox */}
        <FormField
          control={control}
          name="allowPublic"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <input
                  id="allowPublic"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <label
                  htmlFor="allowPublic"
                  className="font-medium"
                >
                  Make Profile Public
                </label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="btn-submit"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
