"use client";

import { useRef, useState, useEffect, forwardRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useTeam } from "@/context/TeamContext";

import Editor from "@/components/shared/Editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import FormField from "@/components/shared/FormField"; // ✅ Centralized FormField
import Countries from "@/assets/countries.json";
import PhoneInput from "react-phone-number-input";
import { parsePhoneNumberFromString } from "libphonenumber-js";

import { Settings } from "lucide-react";
import DeleteTeamSection from "@/components/teams/DeleteTeamSection";

// ✅ PhoneInput wrapper
const PhoneInputField = forwardRef((props, ref) => (
  <input
    ref={ref}
    {...props}
    className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full"
  />
));

export default function TeamSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const { team, setTeam } = useTeam();
  const teamSlug = params.slug;

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(team?.logoURL || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    if (team) {
      const parsed = parsePhoneNumberFromString(
        team.phone || "",
        team.country || "US"
      );
      setForm({
        info: team.info || "",
        email: team.email || "",
        phone: parsed?.isValid() ? parsed.number : "",
        address: team.address || "",
        address2: team.address2 || "",
        city: team.city || "",
        state: team.state || "",
        postalCode: team.postalCode || "",
        country: team.country || "US",
      });
    }
  }, [team]);

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
      router.refresh();
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
    setForm((prev) => ({ ...prev, phone: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamSlug}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setTeam((prev) => ({ ...prev, ...updated }));
      toast.success("Team info updated successfully!");
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* ✅ Page Header */}
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
        {/* ✅ Logo Upload */}
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

        {/* ✅ Public Info */}
        <Card>
          <CardHeader>
            <CardTitle>Public Info</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField label="Team Description">
              <Editor
                text={form.info}
                onChange={(val) => setForm((prev) => ({ ...prev, info: val }))}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ✅ Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Email">
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input"
              />
            </FormField>
            <FormField label="Phone">
              <PhoneInput
                international
                defaultCountry="US"
                value={form.phone}
                onChange={handlePhoneChange}
                inputComponent={PhoneInputField}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ✅ Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Address"
                className="sm:col-span-2"
              >
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="input"
                />
              </FormField>
              <FormField
                label="Address 2"
                className="sm:col-span-2"
              >
                <input
                  name="address2"
                  value={form.address2}
                  onChange={handleChange}
                  className="input"
                />
              </FormField>
              <FormField label="City">
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="input"
                />
              </FormField>
              <FormField label="State">
                <input
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className="input"
                />
              </FormField>
              <FormField label="Postal Code">
                <input
                  name="postalCode"
                  value={form.postalCode}
                  onChange={handleChange}
                  className="input"
                />
              </FormField>
              <FormField label="Country">
                <Select
                  value={form.country}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, country: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {Countries.map((c) => (
                      <SelectItem
                        key={c.code3}
                        value={c.code3}
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Save Button */}
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

      {/* ✅ Danger Zone */}
      {team && (
        <div className="border border-red-500 rounded-lg p-6 bg-transparent">
          <h3 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h3>
          <p className="text-gray-300 mb-4 text-sm leading-relaxed">
            Deleting this team will permanently remove all associated data,
            including members, match reports, and scouting reports. This action
            cannot be undone.
          </p>
          <Button
            variant="destructive"
            className="bg-red-700 hover:bg-red-800 text-white font-semibold px-4 py-2 rounded-md"
            onClick={() => {
              // ✅ Trigger delete confirmation modal or DeleteTeamSection logic
              document.getElementById("delete-team-trigger")?.click();
            }}
          >
            Delete Team
          </Button>
          {/* Hidden DeleteTeamSection for modal or confirmation */}
          <div className="hidden">
            <DeleteTeamSection
              teamSlug={team.teamSlug}
              teamName={team.teamName}
            />
          </div>
        </div>
      )}
    </div>
  );
}
