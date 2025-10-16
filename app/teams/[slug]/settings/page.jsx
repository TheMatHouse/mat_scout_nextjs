// app/teams/[slug]/settings/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useRef, useState, useEffect, forwardRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useTeam } from "@/context/TeamContext";
import "react-phone-number-input/style.css";

import Editor from "@/components/shared/Editor"; // ✅ WYSIWYG back in
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormField from "@/components/shared/FormField";
import PhoneInput from "react-phone-number-input";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Settings } from "lucide-react";
import DeleteTeamSection from "@/components/teams/DeleteTeamSection";
import Spinner from "@/components/shared/Spinner";

// ✅ New shared country select (native <select> + pinned countries)
import CountrySelect from "@/components/shared/CountrySelect";

const PhoneInputField = forwardRef((props, ref) => (
  <input
    ref={ref}
    {...props}
    className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full"
  />
));
PhoneInputField.displayName = "PhoneInputField";

export default function TeamSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.slug;

  const { team, setTeam } = useTeam();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [logoPreview, setLogoPreview] = useState(team?.logoURL || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef();

  const shapeFormFromTeam = (t) => {
    if (!t) return null;
    const parsed = parsePhoneNumberFromString(t.phone || "", t.country || "US");
    return {
      info: t.info || "",
      email: t.email || "",
      phone: parsed?.isValid() ? parsed.number : t.phone || "",
      address: t.address || "",
      address2: t.address2 || "",
      city: t.city || "",
      state: t.state || "",
      postalCode: t.postalCode || "",
      country: t.country || "US", // we store ISO-3 codes in CountrySelect; default to US
    };
  };

  // Hydrate quickly from context (SSR)
  useEffect(() => {
    if (!team) return;
    setForm(shapeFormFromTeam(team));
    setLogoPreview(team.logoURL || null);
    setHydrating(false);
  }, [team]);

  // Helper: refetch full team from API and hydrate context + form
  const refetchTeam = async () => {
    try {
      const res = await fetch(`/api/teams/${teamSlug}?ts=${Date.now()}`, {
        credentials: "include",
      });
      const text = await res.text();
      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch {}
      if (!res.ok) {
        console.warn("Team refetch failed:", res.status, text);
        return;
      }
      const fetchedTeam = payload?.team ?? payload;
      if (fetchedTeam?._id) {
        setTeam((prev) => ({ ...(prev || {}), ...fetchedTeam }));
        setForm(shapeFormFromTeam(fetchedTeam));
        setLogoPreview(fetchedTeam.logoURL || null);
      }
    } catch (err) {
      console.error("Refetch team failed:", err);
    }
  };

  // Definitive refetch to ensure all fields present
  useEffect(() => {
    if (!teamSlug) return;
    refetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamSlug]);

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const data = new FormData();
    data.append("image", file);
    try {
      const res = await fetch(`/api/teams/${teamSlug}/upload-logo`, {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      toast.success("Logo updated");
      setLogoPreview(result.url);
      setTeam((prev) => ({
        ...prev,
        logoURL: result.url,
        logoType: "uploaded",
      }));
    } catch (err) {
      console.error(err);
      toast.error("Error uploading logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => {
    setForm((prev) => ({ ...prev, phone: value || "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const text = await res.text();
      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch {}

      if (!res.ok) {
        console.error("Update failed:", res.status, text);
        const msg = payload?.message || `Update failed (${res.status})`;
        toast.error(msg);
        return;
      }

      const updatedTeam = payload?.team ?? payload;
      if (updatedTeam?._id) {
        setTeam((prev) => ({ ...(prev || {}), ...updatedTeam }));
        const mergedForForm = shapeFormFromTeam({
          ...(team || {}),
          ...updatedTeam,
        });
        setForm((prev) => ({ ...(prev || {}), ...(mergedForForm || {}) }));
        if (updatedTeam.logoURL) setLogoPreview(updatedTeam.logoURL);
      } else {
        await refetchTeam();
      }

      toast.success("Team info updated successfully!");

      // ✅ Smooth scroll to top after save
      window.scrollTo({ top: 0, behavior: "smooth" });

      // If slug changed, navigate
      if (updatedTeam?.teamSlug && updatedTeam.teamSlug !== teamSlug) {
        router.replace(`/teams/${updatedTeam.teamSlug}/settings`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (hydrating || !form) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-500 dark:text-gray-300 mt-2 text-lg">
          Loading team settings…
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your team details, contact info, and branding.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8"
      >
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Team Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Team Logo"
                  className="w-24 h-24 rounded-full border object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border bg-gray-200 dark:bg-gray-700" />
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleLogoChange}
                className="block text-sm file:py-2 file:px-4 file:rounded file:border-0 file:bg-ms-blue file:text-white hover:file:bg-ms-dark-red"
              />
              {uploadingLogo && (
                <p className="text-sm text-gray-500">Uploading...</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Public Info (WYSIWYG) */}
        <Card>
          <CardHeader>
            <CardTitle>Public Info</CardTitle>
          </CardHeader>
          <CardContent>
            <Editor
              name="info"
              label="team description"
              text={form.info}
              onChange={(val) => setForm((p) => ({ ...p, info: val }))}
            />
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="input"
            />
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <PhoneInput
                international
                defaultCountry="US"
                value={form.phone}
                onChange={handlePhoneChange}
                inputComponent={PhoneInputField}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="sm:col-span-2 input"
              />
              <FormField
                label="address 2"
                name="address2"
                value={form.address2}
                onChange={handleChange}
                className="sm:col-span-2 input"
              />
              <FormField
                label="city"
                name="city"
                value={form.city}
                onChange={handleChange}
                className="input"
              />
              <FormField
                label="state"
                name="state"
                value={form.state}
                onChange={handleChange}
                className="input"
              />
              <FormField
                label="postal code"
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                className="input"
              />

              {/* ✅ Unified Country select */}
              <CountrySelect
                label="Country"
                value={form.country}
                onChange={(v) => setForm((prev) => ({ ...prev, country: v }))}
              />
            </div>
          </CardContent>
        </Card>

        <div className="text-right">
          <Button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {team && (
        <DeleteTeamSection
          teamSlug={team.teamSlug}
          teamName={team.teamName}
        />
      )}
    </div>
  );
}
