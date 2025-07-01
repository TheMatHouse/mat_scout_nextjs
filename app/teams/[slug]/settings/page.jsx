"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTeam } from "@/context/TeamContext";

import Editor from "@/components/shared/Editor";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import Image from "next/image";

export default function TeamSettingsPage() {
  const router = useRouter();
  const { team, setTeam } = useTeam();
  const teamSlug = team?.teamSlug;

  const parsedPhone = parsePhoneNumberFromString(
    team?.phone || "",
    team?.country || "US"
  );
  const formattedPhone = parsedPhone?.isValid() ? parsedPhone.number : "";

  const code3To2 = Object.fromEntries(Countries.map((c) => [c.code3, c.code2]));

  const [form, setForm] = useState({
    info: team?.info || "",
    email: team?.email || "",
    phone: formattedPhone,
    address: team?.address || "",
    address2: team?.address2 || "",
    city: team?.city || "",
    state: team?.state || "",
    postalCode: team?.postalCode || "",
    country: team?.country || "US",
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Logo Upload
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(team?.logoURL || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef();

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true); // show “Uploading…” indicator

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`/api/teams/${team.teamSlug}/upload-logo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      toast.success("Logo updated");

      // 1) update the preview immediately
      setLogoPreview(data.url);
      // 2) update the client context
      setTeam({ ...team, logoURL: data.url, logoType: "uploaded" });
      // 3) force Next.js to re-fetch any server-rendered UI that uses team.logoURL
      router.refresh();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Error uploading logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/teams/${teamSlug}/update`, {
        method: "PATCH",
        body: JSON.stringify(form),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Update failed");

      const updatedTeam = await res.json();
      setTeam(updatedTeam);
      toast.success("Team info updated successfully!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
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

              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-ms-blue file:text-white
                  hover:file:bg-ms-dark-red"
                />
                {uploadingLogo && (
                  <p className="text-sm text-gray-500">Uploading...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Public Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Public Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label htmlFor="info">Team Description</Label>
              <Editor
                text={form.info}
                onChange={(val) => setForm({ ...form, info: val })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <PhoneInput
                  international
                  defaultCountry="US"
                  value={form.phone}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, phone: value }))
                  }
                  className="flex w-full"
                  inputComponent={(props) => (
                    <input
                      {...props}
                      className="w-full rounded-md border border-gray-600 bg-gray-800 text-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    />
                  )}
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
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, country: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {Countries.map((country) => (
                      <SelectItem
                        key={country.code3}
                        value={country.code3}
                      >
                        {country.name}
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
    </div>
  );
}
