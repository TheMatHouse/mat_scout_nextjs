// app/(dashboard)/dashboard/settings/DashboardSettings.jsx
"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Pencil, Camera, Copy, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsForm from "./forms/SettingsForm";
import ModalLayout from "@/components/shared/ModalLayout";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import GoogleIcon from "@/components/icons/GoogleIcon";
import FacebookIcon from "@/components/icons/FacebookIcon";

// Cloudinary delivery helper: inject f_auto,q_auto (+ optional transforms)
function cld(url, extra = "") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url; // skip non-Cloudinary URLs
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

export default function DashboardSettings({ user, refreshUser }) {
  const [open, setOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [viewUser, setViewUser] = useState(user); // ← local, updatable copy
  const router = useRouter();

  // keep local copy in sync if parent user changes
  useEffect(() => {
    setViewUser(user);
  }, [user]);

  if (!viewUser) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Personal Settings</h1>
        <p className="text-red-500">
          Unable to load your profile data. Please try again.
        </p>
      </section>
    );
  }

  // Pick the correct base avatar URL (google/facebook/uploaded/default)
  let baseAvatarUrl = viewUser.avatar;
  if (viewUser.avatarType === "google") baseAvatarUrl = viewUser.googleAvatar;
  if (viewUser.avatarType === "facebook")
    baseAvatarUrl = viewUser.facebookAvatar;
  if (viewUser.avatarType === "uploaded") baseAvatarUrl = viewUser.avatar;
  if (!baseAvatarUrl) {
    baseAvatarUrl =
      "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";
  }

  const displayAvatarUrl =
    avatarPreview || cld(baseAvatarUrl, "w_192,h_192,c_fill,g_auto,dpr_auto");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;
      setAvatarPreview(base64Image);

      try {
        const res = await fetch(`/api/dashboard/${viewUser._id}/avatar`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image, avatarType: "uploaded" }),
        });

        if (!res.ok) throw new Error("Failed to upload avatar");

        toast.success("Avatar updated successfully");
        setAvatarPreview(null);
        await refreshUser?.();
        router.refresh();
      } catch (err) {
        console.error("Upload error:", err);
        toast.error("Error updating avatar");
      }
    };

    reader.readAsDataURL(file);
  };

  const revertToSocial = async (provider) => {
    await fetch(`/api/dashboard/${viewUser._id}/avatar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarType: provider }),
    });

    toast.success(`Switched to ${provider} avatar`);
    await refreshUser?.();
    router.refresh();
  };

  const revertToUploaded = async () => {
    await fetch(`/api/dashboard/${viewUser._id}/avatar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarType: "uploaded", image: "use-existing" }),
    });

    toast.success("Switched to uploaded avatar");
    await refreshUser?.();
    router.refresh();
  };

  const handleResendVerification = async () => {
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json();
      if (data.message) {
        toast.success(data.message);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to resend verification email.");
    }
  };

  // Pretty gender display
  const prettyGender =
    viewUser.gender && viewUser.gender !== "not specified"
      ? viewUser.gender.charAt(0).toUpperCase() + viewUser.gender.slice(1)
      : "Not specified";

  // Show whatever location parts are present (don’t require all 3)
  const locationParts = [
    viewUser.city,
    viewUser.state,
    viewUser.country,
  ].filter((v) => v && v !== "not specified");
  const locationDisplay =
    locationParts.length > 0 ? locationParts.join(", ") : null;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      {viewUser && !viewUser.verified && (
        <div className="bg-[var(--ms-blue-gray)] text-white px-4 py-3 rounded text-center mb-4">
          Please verify your email to unlock full features.
          <button
            onClick={handleResendVerification}
            className="ml-2 text-white underline font-medium hover:opacity-80 transition-colors"
          >
            Resend verification email
          </button>
        </div>
      )}

      {/* Profile Header */}
      <header className="mb-6">
        <div className="flex flex-col items-center gap-4 mb-4">
          <Image
            src={displayAvatarUrl}
            alt="User Avatar"
            width={96}
            height={96}
            className="rounded-full border object-cover w-24 h-24"
            loading="lazy"
            sizes="96px"
          />

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded border text-sm hover:bg-muted transition">
            <Camera className="h-4 w-4" /> Change Avatar
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <div className="flex gap-2 flex-wrap justify-center">
            {viewUser.googleAvatar && viewUser.avatarType !== "google" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => revertToSocial("google")}
              >
                <GoogleIcon className="w-4 h-4 mr-1" /> Google Avatar
              </Button>
            )}
            {viewUser.facebookAvatar && viewUser.avatarType !== "facebook" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => revertToSocial("facebook")}
              >
                <FacebookIcon className="w-4 h-4 mr-1" /> Facebook Avatar
              </Button>
            )}
            {viewUser.avatarType !== "uploaded" && viewUser.avatarId && (
              <Button
                variant="outline"
                size="sm"
                onClick={revertToUploaded}
              >
                Uploaded Avatar
              </Button>
            )}
          </div>

          <h1 className="text-3xl font-bold text-center">
            {viewUser.firstName} {viewUser.lastName}
          </h1>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            Edit Settings <Pencil className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Edit Settings"
        description="Update your personal settings below."
        withCard={true}
      >
        <SettingsForm
          user={viewUser}
          onClose={() => setOpen(false)}
          refreshUser={refreshUser}
          // ⬇️ update local view immediately when API returns the new user
          onSaved={(updated) => {
            if (updated) setViewUser(updated);
          }}
        />
      </ModalLayout>

      {/* Info Cards */}
      <div className="space-y-4 mt-6">
        <div className="settings-card flex justify-between items-center">
          <div>
            <p className="font-semibold">Your Public Profile</p>
            <a
              href={`https://matscout.com/${viewUser.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline break-all"
            >
              https://matscout.com/{viewUser.username}
            </a>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://matscout.com/${viewUser.username}`
                );
                toast.success("Copied profile link");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            {typeof navigator !== "undefined" && navigator.share && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  navigator.share({
                    title: "Check out my MatScout profile",
                    url: `https://matscout.com/${viewUser.username}`,
                  })
                }
              >
                <Share className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="settings-card">
          <h2 className="text-lg font-semibold mb-1">Email</h2>
          <p className="text-sm">{viewUser.email}</p>
        </div>

        {/* Location */}
        <div className="settings-card">
          <h2 className="text-lg font-semibold mb-1">Location</h2>
          {locationDisplay ? (
            <p className="text-sm">{locationDisplay}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No location info provided
            </p>
          )}
        </div>

        {/* Gender */}
        <div className="settings-card">
          <h2 className="text-lg font-semibold mb-1">Gender</h2>
          <p className="text-sm">{prettyGender}</p>
        </div>

        {/* Privacy */}
        <div className="settings-card">
          <h2 className="text-lg font-semibold mb-1">Privacy Settings</h2>
          <p className="text-sm">
            Your profile is currently{" "}
            <span className="font-semibold">
              {viewUser.allowPublic === "Public" ||
              viewUser.allowPublic === true
                ? "Public"
                : "Private"}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
