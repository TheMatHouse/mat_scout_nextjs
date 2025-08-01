"use client";

import { useRef, useState, useEffect, forwardRef } from "react";
import { toast } from "react-toastify";
import { useRouter, useParams } from "next/navigation";
import { useTeam } from "@/context/TeamContext";

import Editor from "@/components/shared/Editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Countries from "@/assets/countries.json";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
import { parsePhoneNumberFromString } from "libphonenumber-js";

// ✅ Import Delete Section
import DeleteTeamSection from "@/components/teams/DeleteTeamSection";

// Stable input component for PhoneInput to avoid remounts
const PhoneInputField = forwardRef((props, ref) => (
  <Input
    ref={ref}
    {...props}
    className="!rounded-none !rounded-r-md"
  />
));

export default function TeamSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const { team, setTeam } = useTeam();
  const teamSlug = params.slug;

  // form state
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // initialize form when team loads
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

  // logo upload
  const [logoPreview, setLogoPreview] = useState(team?.logoURL || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef();

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
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
        Team Settings
      </h2>
      <form
        onSubmit={handleSubmit}
        className="space-y-8"
      >
        {/* Logo Upload */}
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

        {/* Public Info */}
        <Card>
          <CardHeader>
            <CardTitle>Public Info</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="info">Team Description</Label>
            <Editor
              text={form.info}
              onChange={(val) => setForm((prev) => ({ ...prev, info: val }))}
            />
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <div className="flex flex-1">
                <PhoneInput
                  international
                  defaultCountry="US"
                  value={form.phone}
                  onChange={handlePhoneChange}
                  inputComponent={PhoneInputField}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Section */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address2">Address 2</Label>
                <Input
                  id="address2"
                  name="address2"
                  value={form.address2}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={form.postalCode}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="text-right">
          <Button
            variant="ms"
            size="default"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* ✅ Danger Zone - Delete Team */}
      {team && (
        <DeleteTeamSection
          teamSlug={team.teamSlug}
          teamName={team.teamName}
        />
      )}
    </div>
  );
}
