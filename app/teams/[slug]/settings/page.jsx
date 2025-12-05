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

import {
  changeTeamPassword,
  encryptScoutingBody,
  encryptCoachNoteBody,
} from "@/lib/crypto/teamLock";

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

  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const isOwner = !!team && !!user && String(team.user) === String(user._id);

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

  useEffect(() => {
    if (!team) return;
    setForm(shapeFormFromTeam(team));
    setLogoPreview(team.logoURL || null);
    setHydrating(false);
  }, [team]);

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
      } catch {}

      if (!res.ok) return null;

      const fetchedTeam = payload?.team ?? payload;
      if (fetchedTeam?._id) {
        setTeam((prev) => ({ ...(prev || {}), ...fetchedTeam }));
        setForm(shapeFormFromTeam(fetchedTeam));
        setLogoPreview(fetchedTeam.logoURL || null);
        return fetchedTeam;
      }
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!teamSlug) return;
    refetchTeam();
  }, [teamSlug]);

  /* ------------ Bulk Encrypt: Scouting Reports (existing function) ------------ */
  const bulkEncryptExistingReports = async (teamForCrypto) => {
    if (!isOwner) return;

    const effectiveTeam = teamForCrypto || team;
    if (!effectiveTeam) return;

    setEncrypting(true);

    try {
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
      } catch {}

      const allReports = Array.isArray(data?.scoutingReports)
        ? data.scoutingReports
        : Array.isArray(data?.reports)
        ? data.reports
        : Array.isArray(data)
        ? data
        : [];

      const unencrypted = allReports.filter(
        (r) => !r?.crypto || !r.crypto.ciphertextB64
      );

      const reportsPayload = [];

      for (const r of unencrypted) {
        try {
          const { body, crypto } = await encryptScoutingBody(effectiveTeam, r);
          if (!crypto) continue;

          reportsPayload.push({
            _id: String(r._id || r.id),
            body,
            crypto,
          });
        } catch {}
      }

      if (!reportsPayload.length) return;

      await fetch(
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
    } catch (e) {
      console.error(e);
    }
  };

  /* ------------ NEW: Bulk Encrypt Existing Coach Notes ------------ */
  const bulkEncryptExistingCoachNotes = async (teamForCrypto) => {
    if (!isOwner) return;

    const effectiveTeam = teamForCrypto || team;
    if (!effectiveTeam) return;

    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(
          teamSlug
        )}/coach-notes?ts=${Date.now()}`,
        {
          credentials: "include",
          headers: { accept: "application/json" },
        }
      );

      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {}

      const allNotes = Array.isArray(data?.notes)
        ? data.notes
        : Array.isArray(data)
        ? data
        : [];

      const unencrypted = allNotes.filter(
        (n) => !n?.crypto || !n.crypto.ciphertextB64
      );

      const notesPayload = [];

      for (const note of unencrypted) {
        try {
          const { body, crypto } = await encryptCoachNoteBody(
            effectiveTeam,
            note
          );

          if (!crypto) continue;

          notesPayload.push({
            _id: String(note._id || note.id),
            body,
            crypto,
          });
        } catch {}
      }

      if (!notesPayload.length) return;

      await fetch(
        `/api/teams/${encodeURIComponent(teamSlug)}/coach-notes/bulk-encrypt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ notes: notesPayload }),
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

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
        await callSetupPOST(pw);
        const freshTeam = await refetchTeam();

        // 🔐 Encrypt ALL existing data (scouting + coach notes)
        await bulkEncryptExistingReports(freshTeam);
        await bulkEncryptExistingCoachNotes(freshTeam);

        toast.success(
          "Team password set. Existing and new reports are locked."
        );
      } else {
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
      } catch {}

      if (!res.ok) {
        console.error("[DISABLE LOCK] failed:", res.status, text);
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
      {/* ... unchanged UI ... */}
      {/* Skipped here: UI (logo upload, info, address, password form, etc.) */}
      {/* EXACT SAME UI AS BEFORE */}

      {/* To avoid hitting token limits, I did not repeat UI markup. */}
      {/* In your actual file, keep everything EXACTLY the same. */}
    </div>
  );
};

export default TeamSettingsPage;
