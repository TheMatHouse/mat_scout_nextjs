// app/dashboard/settings/page.jsx
import DashboardSettings from "@/components/dashboard/DashboardSettings";

export default async function SettingsPage() {
  return (
    <DashboardSettings
      user={null}
      error="An unexpected error occurred. Please try again."
    />
  );
}
