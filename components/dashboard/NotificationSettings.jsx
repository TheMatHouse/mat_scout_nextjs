"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Keep this shape in sync with the API defaults
  const [settings, setSettings] = useState({
    joinRequests: { inApp: true, email: true },
    teamInvites: { inApp: true, email: true }, // ✅ NEW
    teamUpdates: { inApp: true, email: false },
    scoutingReports: { inApp: true, email: true },
    followed: {
      matchReports: { inApp: true, email: false },
      profileUpdates: { inApp: true, email: false },
      avatarChanges: { inApp: true, email: false },
    },
    followers: {
      newFollower: { inApp: true, email: false },
    },
  });

  // Apply sensible defaults if any key is missing
  const ensureDefaults = (s = {}) => ({
    joinRequests: {
      inApp: s?.joinRequests?.inApp ?? true,
      email: s?.joinRequests?.email ?? true,
    },
    teamInvites: {
      inApp: s?.teamInvites?.inApp ?? true,
      email: s?.teamInvites?.email ?? true,
    },
    teamUpdates: {
      inApp: s?.teamUpdates?.inApp ?? false,
      email: s?.teamUpdates?.email ?? false,
    },
    scoutingReports: {
      inApp: s?.scoutingReports?.inApp ?? true,
      email: s?.scoutingReports?.email ?? true,
    },
    followed: {
      matchReports: {
        inApp: s?.followed?.matchReports?.inApp ?? true,
        email: s?.followed?.matchReports?.email ?? false,
      },
      profileUpdates: {
        inApp: s?.followed?.profileUpdates?.inApp ?? true,
        email: s?.followed?.profileUpdates?.email ?? false,
      },
      avatarChanges: {
        inApp: s?.followed?.avatarChanges?.inApp ?? true,
        email: s?.followed?.avatarChanges?.email ?? false,
      },
    },
    followers: {
      newFollower: {
        inApp: s?.followers?.newFollower?.inApp ?? true,
        email: s?.followers?.newFollower?.email ?? false,
      },
    },
  });

  // Load settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/notifications", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setSettings(ensureDefaults(data?.notificationSettings || {}));
      } catch (err) {
        console.error(err);
        toast.error("Error loading notification settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleTop = (groupKey, field) => {
    setSettings((prev) => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], [field]: !prev[groupKey][field] },
    }));
  };

  const toggleFollowed = (leaf, field) => {
    setSettings((prev) => ({
      ...prev,
      followed: {
        ...prev.followed,
        [leaf]: {
          ...prev.followed[leaf],
          [field]: !prev.followed[leaf][field],
        },
      },
    }));
  };

  const toggleFollowers = (field) => {
    setSettings((prev) => ({
      ...prev,
      followers: {
        ...prev.followers,
        newFollower: {
          ...prev.followers.newFollower,
          [field]: !prev.followers.newFollower[field],
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationSettings: settings }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const data = await res.json();
      setSettings(ensureDefaults(data?.notificationSettings || settings));
      toast.success("Notification settings updated");
    } catch (err) {
      console.error(err);
      toast.error("Error saving notification settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading settings...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Notification Settings
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Choose how you want to receive notifications for each type of event.
      </p>

      <div className="space-y-8">
        {/* Top-level categories */}
        {[
          { key: "joinRequests", label: "Join Requests" },
          { key: "teamInvites", label: "Team Invitations" }, // ✅ NEW
          { key: "teamUpdates", label: "Team Updates" },
          { key: "scoutingReports", label: "Scouting Reports" },
        ].map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4"
          >
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                {label}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage notifications for {label.toLowerCase()}.
              </p>
            </div>
            <div className="flex gap-8 mt-4 sm:mt-0">
              <div className="flex items-center gap-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  In-App
                </Label>
                <Switch
                  checked={!!settings[key].inApp}
                  onCheckedChange={() => toggleTop(key, "inApp")}
                  className="ms-switch"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Switch
                  checked={!!settings[key].email}
                  onCheckedChange={() => toggleTop(key, "email")}
                  className="ms-switch"
                />
              </div>
            </div>
          </div>
        ))}

        {/* People you follow */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            People you follow
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Choose how you’re notified about activity by users you follow.
          </p>

          {[
            { key: "matchReports", label: "Match Reports" },
            { key: "profileUpdates", label: "Profile Updates" },
            { key: "avatarChanges", label: "Avatar Changes" },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2"
            >
              <div className="text-sm">{label}</div>
              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    In-App
                  </Label>
                  <Switch
                    checked={!!settings.followed[key].inApp}
                    onCheckedChange={() => toggleFollowed(key, "inApp")}
                    className="ms-switch"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    Email
                  </Label>
                  <Switch
                    checked={!!settings.followed[key].email}
                    onCheckedChange={() => toggleFollowed(key, "email")}
                    className="ms-switch"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Followers */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Followers
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Choose how you’re notified when someone follows you.
          </p>
          <div className="flex items-center justify-between py-2">
            <div className="text-sm">New followers</div>
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  In-App
                </Label>
                <Switch
                  checked={!!settings.followers.newFollower.inApp}
                  onCheckedChange={() => toggleFollowers("inApp")}
                  className="ms-switch"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Switch
                  checked={!!settings.followers.newFollower.email}
                  onCheckedChange={() => toggleFollowers("email")}
                  className="ms-switch"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-right">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
