// app/teams/[slug]/settings/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useRef, useState, useEffect, forwardRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useTeam } from "@/context/TeamContext";
import "react-phone-number-input/style.css";

import Editor from "@/components/shared/Editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormField from "@/components/shared/FormField";
import PhoneInput from "react-phone-number-input";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  Settings,
  ShieldCheck,
  Lock,
  LockOpen,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import DeleteTeamSection from "@/components/teams/DeleteTeamSection";
import Spinner from "@/components/shared/Spinner";
import CountrySelect from "@/components/shared/CountrySelect";
import ModalLayout from "@/components/shared/ModalLayout";
import TransferOwnershipContent from "@/components/teams/settings/TransferOwnershipContent";
import { useUser } from "@/context/UserContext";
import { changeTeamPassword, encryptScoutingBody } from "@/lib/crypto/teamLock";

/* ---------------- Phone input field ---------------- */
const PhoneInputField = forwardRef((props, ref) => (
  <input
    ref={ref}
    {...props}
    className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full"
  />
));
PhoneInputField.displayName = "PhoneInputField";

/* ------------- Minimal crypto helpers (client) ------------- */
async function pbkdf2DeriveKeyBytes(
  password,
  saltBytes,
  iterations = 250000,
  length = 32
) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const params = {
    name: "PBKDF2",
    hash: "SHA-256",
    salt: saltBytes,
    iterations,
  };
  const bits = await crypto.subtle.deriveBits(params, keyMaterial, length * 8);
  return new Uint8Array(bits);
}
async function sha256(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(buf);
}
function b64encode(uint8) {
  let binary = "";
  for (let i = 0; i < uint8.byteLength; i++)
    binary += String.fromCharCode(uint8[i]);
  return btoa(binary);
}
function b64decode(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/** Derive KDF params + verifier for *initial* server storage */
async function deriveKdfAndVerifier(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 250000;
  const dk = await pbkdf2DeriveKeyBytes(password, salt, iterations, 32);
  const verifierBytes = await sha256(dk);
  return {
    kdf: { saltB64: b64encode(salt), iterations },
    verifierB64: b64encode(verifierBytes),
  };
}

/* ---------------- Page ---------------- */
const TeamSettingsPage = () => {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.slug;

  const { team, setTeam } = useTeam();
  const { user } = useUser();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [logoPreview, setLogoPreview] = useState(team?.logoURL || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef();

  // Transfer ownership modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Owner gate
  const isOwner = !!team && !!user && String(team.user) === String(user._id);

  // Security UI
  const lockEnabled = !!team?.security?.lockEnabled;
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwVisible1, setPwVisible1] = useState(false);
  const [pwVisible2, setPwVisible2] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [encrypting, setEncrypting] = useState(false);

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
      country: t.country || "US",
    };
  };

  // Hydrate from context (SSR fast path)
  useEffect(() => {
    if (!team) return;
    setForm(shapeFormFromTeam(team));
    setLogoPreview(team.logoURL || null);
    setHydrating(false);
  }, [team]);

  // Fetch full team (owner gets fullSecurity if asked)
  const refetchTeam = async () => {
    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(
          teamSlug
        )}?fullSecurity=1&ts=${Date.now()}`,
        { credentials: "include" }
      );
      const text = await res.text();
      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
      if (!res.ok) {
        console.warn("Team refetch failed:", res.status, text);
        return null;
      }
      const fetchedTeam = payload?.team ?? payload;
      if (fetchedTeam?._id) {
        setTeam((prev) => ({ ...(prev || {}), ...fetchedTeam }));
        setForm(shapeFormFromTeam(fetchedTeam));
        setLogoPreview(fetchedTeam.logoURL || null);
        return fetchedTeam;
      }
      return null;
    } catch (err) {
      console.error("Refetch team failed:", err);
      return null;
    }
  };

  useEffect(() => {
    if (!teamSlug) return;
    refetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamSlug]);

  /* ------------ Logo upload ------------ */
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

  /* ------------ Team info save ------------ */
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
      } catch {
        payload = null;
      }
      if (!res.ok) {
        console.error("Update failed:", res.status, text);
        toast.error(payload?.message || `Update failed (${res.status})`);
        return;
      }
      const updatedTeam = payload?.team ?? payload;
      await refetchTeam();
      toast.success("Team info updated successfully!");
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  /* ------------ SECURITY: create or update ------------ */
  const callSetupPOST = async (password) => {
    const { kdf, verifierB64 } = await deriveKdfAndVerifier(password);
    const res = await fetch(
      `/api/teams/${encodeURIComponent(teamSlug)}/security/setup`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kdf, verifierB64 }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "Failed to initialize team lock");
    }
    return data;
  };

  // 🔐 Used only internally after first password is created
  const bulkEncryptExistingReports = async (teamForCrypto) => {
    if (!isOwner) return;

    const effectiveTeam = teamForCrypto || team;
    if (!effectiveTeam) {
      console.warn("[BULK ENCRYPT] No team loaded, skipping.");
      return;
    }

    console.log("[BULK ENCRYPT] starting for team", teamSlug);
    setEncrypting(true);

    try {
      // 1) Load ALL reports for this team
      const res = await fetch(
        `/api/teams/${encodeURIComponent(
          teamSlug
        )}/scouting-reports?ts=${Date.now()}`,
        {
          credentials: "include",
          headers: { accept: "application/json" },
        }
      );

      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok) {
        console.error("[BULK ENCRYPT] list failed:", res.status, text);
        toast.error("Failed to load scouting reports for encryption.");
        return;
      }

      const allReports = Array.isArray(data?.scoutingReports)
        ? data.scoutingReports
        : Array.isArray(data?.reports)
        ? data.reports
        : Array.isArray(data)
        ? data
        : [];

      console.log("[BULK ENCRYPT] fetched total reports:", allReports.length);

      // 2) Only encrypt reports that do NOT yet have ciphertext
      const unencrypted = allReports.filter(
        (r) => !r?.crypto || !r.crypto.ciphertextB64
      );

      console.log("[BULK ENCRYPT] unencrypted candidates:", unencrypted.length);

      if (unencrypted.length === 0) {
        toast.info("No existing reports needed encryption.");
        return;
      }

      // 3) Encrypt each one on the client using the Team Box Key
      const reportsPayload = [];

      for (const r of unencrypted) {
        try {
          const { body, crypto } = await encryptScoutingBody(effectiveTeam, r);

          if (!crypto) {
            console.warn(
              "[BULK ENCRYPT] encryptScoutingBody returned no crypto for",
              r._id
            );
            continue;
          }

          reportsPayload.push({
            _id: String(r._id || r.id),
            body,
            crypto,
          });
        } catch (err) {
          console.warn(
            "[BULK ENCRYPT] failed to encrypt report, skipping",
            r._id,
            err
          );
        }
      }

      console.log(
        "[BULK ENCRYPT] prepared payload length:",
        reportsPayload.length
      );

      if (reportsPayload.length === 0) {
        toast.error("No reports could be encrypted.");
        return;
      }

      // 4) Send encrypted payload to bulk-encrypt API
      const bulkRes = await fetch(
        `/api/teams/${encodeURIComponent(
          teamSlug
        )}/scouting-reports/bulk-encrypt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ reports: reportsPayload }),
        }
      );

      const bulkText = await bulkRes.text();
      let bulkData = null;
      try {
        bulkData = JSON.parse(bulkText);
      } catch {
        bulkData = null;
      }

      if (!bulkRes.ok) {
        console.error(
          "[BULK ENCRYPT] bulk-encrypt failed:",
          bulkRes.status,
          bulkText
        );
        toast.error(bulkData?.message || "Bulk encrypt failed.");
        return;
      }

      toast.success(
        bulkData?.message ||
          `Encrypted ${reportsPayload.length} scouting report(s).`
      );
    } catch (e) {
      console.error("[BULK ENCRYPT] unexpected error:", e);
      toast.error(e.message || "Bulk encrypt failed.");
    } finally {
      setEncrypting(false);
    }
  };

  const handleEnableOrUpdatePassword = async () => {
    if (!isOwner) return;
    if (!pw || !pw2) {
      toast.error("Please enter and confirm the team password.");
      return;
    }
    if (pw !== pw2) {
      toast.error("Passwords do not match.");
      return;
    }

    setSavingSecurity(true);
    try {
      const hasKdf =
        !!team?.security?.kdf?.saltB64 && !!team?.security?.verifierB64;

      if (!hasKdf) {
        // Initial setup: store KDF/verifier, then encrypt any existing reports
        await callSetupPOST(pw);
        const freshTeam = await refetchTeam();
        await bulkEncryptExistingReports(freshTeam);
        toast.success(
          "Team password set. Existing and new reports are locked."
        );
      } else {
        // Password change: preserve TBK using the helper
        await changeTeamPassword(team, pw);
        await refetchTeam();
        toast.success("Team password updated.");
      }

      setPw("");
      setPw2("");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to set team password.");
    } finally {
      setSavingSecurity(false);
    }
  };

  /* ------------ SECURITY: disable lock (no DB decrypt) ------------ */
  const handleDisableLock = async () => {
    if (!isOwner) return;
    if (
      !window.confirm(
        "Disabling the lock will stop the team password prompt for this team. All existing reports remain encrypted in the database. Continue?"
      )
    ) {
      return;
    }

    setSavingSecurity(true);

    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(teamSlug)}/security`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ lockEnabled: false }),
        }
      );

      const text = await res.text();
      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }

      if (!res.ok) {
        console.error(
          "[DISABLE LOCK] Disable lock failed:",
          res.status,
          text || payload
        );
        toast.error(payload?.message || "Failed to disable team lock.");
        return;
      }

      toast.success(
        "Team lock disabled. Existing reports stay encrypted in the database."
      );
      await refetchTeam();
    } catch (e) {
      console.error("[DISABLE LOCK] unexpected error:", e);
      toast.error(e.message || "Failed to disable lock.");
    } finally {
      setSavingSecurity(false);
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

      {/* Team info form */}
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

        {/* Public Info */}
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

        {/* Contact + Address */}
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
                className="sm:col-span-2"
              />
              <FormField
                label="address 2"
                name="address2"
                value={form.address2}
                onChange={handleChange}
                className="sm:col-span-2"
              />
              <FormField
                label="city"
                name="city"
                value={form.city}
                onChange={handleChange}
              />
              <FormField
                label="state"
                name="state"
                value={form.state}
                onChange={handleChange}
              />
              <FormField
                label="postal code"
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
              />
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

      {/* Team Password & Encryption (Owner only) */}
      {isOwner && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <CardTitle>Team Password &amp; Encryption</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {lockEnabled ? (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <Lock className="w-4 h-4" /> Lock Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <LockOpen className="w-4 h-4" /> Lock Disabled
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-5">
                When you create a team password, all{" "}
                <span className="font-semibold">existing and new</span> scouting
                reports for this team are encrypted with your team key. Turning
                the lock off later only removes the password prompt in the app;
                the encrypted data always remains encrypted in the database.
              </p>

              {/* Label above password fields */}
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {lockEnabled ? "Update Team Password" : "Create Team Password"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password + eye toggle */}
                <div className="relative">
                  <FormField
                    type={pwVisible1 ? "text" : "password"}
                    label="Team Password"
                    name="teamPassword"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder={
                      lockEnabled
                        ? "Enter new team password"
                        : "Enter team password"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setPwVisible1((v) => !v)}
                    className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
                    aria-label="Toggle password visibility"
                  >
                    {pwVisible1 ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <FormField
                    type={pwVisible2 ? "text" : "password"}
                    label="Confirm Password"
                    name="teamPassword2"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setPwVisible2((v) => !v)}
                    className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
                    aria-label="Toggle password visibility"
                  >
                    {pwVisible2 ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleEnableOrUpdatePassword}
                disabled={savingSecurity || encrypting || !pw || !pw2}
                className="inline-flex items-center gap-2 bg-ms-blue-gray hover:bg-ms-blue text-white"
              >
                <KeyRound className="w-4 h-4" />
                {lockEnabled ? "Update Password" : "Enable Lock"}
              </Button>

              {lockEnabled && (
                <Button
                  onClick={handleDisableLock}
                  disabled={savingSecurity}
                  variant="outline"
                  className="inline-flex items-center gap-2"
                >
                  <LockOpen className="w-4 h-4" />
                  Disable Lock
                </Button>
              )}
            </div>

            {/* Base explanation */}
            <p className="text-xs text-muted-foreground">
              Turning on the lock gates access to team scouting reports (and
              later coach’s notes) behind the team password. The encrypted data
              always stays encrypted in the database; disabling the lock only
              turns off the password prompt until you re-enable it.
            </p>

            {/* Extra note when updating */}
            {lockEnabled && (
              <p className="text-xs text-gray-600 dark:text-gray-300">
                When you update the team password, you’ll be asked for the
                current password first (if this browser isn’t already unlocked).
                Your team’s encrypted scouting reports stay readable, and only
                the password used to protect them is rotated.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ownership Section (owner only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Ownership</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              You are the current team owner. Transfer ownership to a manager
              and set your new role.
            </p>
            <Button
              onClick={() => setIsTransferOpen(true)}
              className="btn btn-primary"
            >
              Transfer Ownership
            </Button>
          </CardContent>
        </Card>
      )}

      {team && (
        <DeleteTeamSection
          teamSlug={team.teamSlug}
          teamName={team.teamName}
        />
      )}

      {/* Transfer Ownership Modal */}
      <ModalLayout
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Team Ownership"
        description="Select a manager to become the new owner and choose your new role."
        withCard
      >
        <TransferOwnershipContent
          slug={teamSlug}
          onClose={() => setIsTransferOpen(false)}
          onComplete={() => {
            window.location.reload();
          }}
        />
      </ModalLayout>
    </div>
  );
};

export default TeamSettingsPage;
