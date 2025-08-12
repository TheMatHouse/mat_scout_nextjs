"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Switch } from "@/components/ui/switch"; // shadcn switch
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    joinRequests: { inApp: true, email: true },
    teamUpdates: { inApp: true, email: true },
    scoutingReports: { inApp: true, email: true },
  });

  // ✅ Fetch settings on load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings/notifications");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setSettings({
          joinRequests: {
            inApp: data.notificationSettings?.joinRequests?.inApp ?? true,
            email: data.notificationSettings?.joinRequests?.email ?? true,
          },
          teamUpdates: {
            inApp: data.notificationSettings?.teamUpdates?.inApp ?? true,
            email: data.notificationSettings?.teamUpdates?.email ?? false, // model default
          },
          scoutingReports: {
            inApp: data.notificationSettings?.scoutingReports?.inApp ?? true,
            email: data.notificationSettings?.scoutingReports?.email ?? true,
          },
        });
      } catch (err) {
        console.error(err);
        toast.error("Error loading notification settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = (category, type) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: !prev[category][type],
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

      {/* Settings Categories */}
      <div className="space-y-8">
        {[
          { key: "joinRequests", label: "Join Requests" },
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
                <Label
                  htmlFor={`${key}-inApp`}
                  className="text-gray-700 dark:text-gray-300"
                >
                  In-App
                </Label>
                <Switch
                  id={`${key}-inApp`}
                  checked={settings[key].inApp}
                  onCheckedChange={() => handleToggle(key, "inApp")}
                  className="ms-switch"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor={`${key}-email`}
                  className="text-gray-700 dark:text-gray-300"
                >
                  Email
                </Label>
                <Switch
                  id={`${key}-email`}
                  checked={settings[key].email}
                  onCheckedChange={() => handleToggle(key, "email")}
                  className="ms-switch"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
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
