// components/dashboard/DashboardSettings.jsx
"use client";

import { useState } from "react";
import { Pencil, Camera } from "lucide-react";
import { useCurrentUser } from "@/context/UserContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SettingsForm from "./forms/SettingsForm";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Copy, Share } from "lucide-react";

import GoogleIcon from "@/components/icons/GoogleIcon";
import FacebookIcon from "@/components/icons/FacebookIcon";

export default function DashboardSettings() {
  const [open, setOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const { user, loading, refreshUser } = useCurrentUser();
  const router = useRouter();

  if (loading) return null;

  if (!user) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Personal Settings</h1>
        <p className="text-red-500">
          Unable to load your profile data. Please try again.
        </p>
      </section>
    );
  }

  let avatarUrl = user.avatar;
  if (user.avatarType === "google") avatarUrl = user.googleAvatar;
  if (user.avatarType === "facebook") avatarUrl = user.facebookAvatar;
  if (user.avatarType === "uploaded") avatarUrl = user.avatar;
  if (!avatarUrl) {
    avatarUrl =
      "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("userId", user._id);

    fetch("/api/upload/avatar", {
      method: "PATCH",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to upload avatar");
        toast.success("Avatar updated successfully");
        setAvatarPreview(null);
        return refreshUser();
      })
      .then(() => router.refresh())
      .catch(() => toast.error("Error updating avatar"));
  };

  const revertToSocial = async (provider) => {
    try {
      const res = await fetch("/api/upload/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, avatarType: provider }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Reverted to ${provider} avatar`);
      await refreshUser();
      router.refresh();
    } catch (err) {
      toast.error("Failed to revert avatar");
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <div className="flex flex-col items-center gap-4 mb-4">
          <Image
            src={avatarPreview || avatarUrl}
            alt="User Avatar"
            width={96}
            height={96}
            className="rounded-full border object-cover w-24 h-24"
          />

          <div className="flex flex-col items-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded border text-sm hover:bg-muted transition">
              <Camera className="h-4 w-4" /> Change Avatar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <div className="flex gap-2">
              {user.googleAvatar && user.avatarType !== "google" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revertToSocial("google")}
                >
                  <GoogleIcon className="w-4 h-4 mr-1" /> Use Google Avatar
                </Button>
              )}
              {user.facebookAvatar && user.avatarType !== "facebook" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revertToSocial("facebook")}
                >
                  <FacebookIcon className="w-4 h-4 mr-1" /> Use Facebook Avatar
                </Button>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center">
            {user.firstName} {user.lastName}
          </h1>
        </div>

        <div className="flex justify-end">
          <Dialog
            open={open}
            onOpenChange={setOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
              >
                Edit Settings <Pencil className="ml-2 h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Settings</DialogTitle>
                <DialogDescription>
                  Update your personal settings below.
                </DialogDescription>
              </DialogHeader>
              <SettingsForm
                user={user}
                onClose={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card text-card-foreground p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm">
            <p className="font-semibold mb-1">Your Public Profile</p>
            <a
              href={`https://matscout.com/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline break-all"
            >
              https://matscout.com/{user.username}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://matscout.com/${user.username}`
                );
                toast.success("Copied profile link");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>

            {navigator.share && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  navigator.share({
                    title: "Check out my MatScout profile",
                    url: `https://matscout.com/${user.username}`,
                  })
                }
              >
                <Share className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground p-4">
          <h2 className="text-lg font-semibold mb-1">Email</h2>
          <p className="text-sm">{user.email}</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground p-4">
          <h2 className="text-lg font-semibold mb-1">Location</h2>
          {user.city && user.state && user.country ? (
            <p className="text-sm">
              {user.city}, {user.state}, {user.country}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No location info provided
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-card text-card-foreground p-4">
          <h2 className="text-lg font-semibold mb-1">Gender</h2>
          <p className="text-sm text-muted-foreground">
            {user.gender || "Not specified"}
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground p-4">
          <h2 className="text-lg font-semibold mb-1">Privacy Settings</h2>
          <p className="text-sm">
            Your profile is currently{" "}
            <span className="font-semibold">
              {user.allowPublic === "Public" || user.allowPublic === true
                ? "Public"
                : "Private"}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
