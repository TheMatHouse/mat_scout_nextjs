"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
            email: data.notificationSettings?.teamUpdates?.email ?? false,
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
    <Card className="card-dark shadow-md">
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Choose how you want to receive notifications for each type of event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {label}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage notifications for {label.toLowerCase()}.
                </p>
              </div>
              <div className="flex gap-6 mt-3 sm:mt-0">
                <div className="flex items-center gap-2">
                  <span className="switch-label">In-App</span>
                  <div
                    className="custom-switch"
                    data-state={settings[key].inApp ? "checked" : "unchecked"}
                    onClick={() => handleToggle(key, "inApp")}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="switch-label">Email</span>
                  <div
                    className="custom-switch"
                    data-state={settings[key].email ? "checked" : "unchecked"}
                    onClick={() => handleToggle(key, "email")}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-right">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
