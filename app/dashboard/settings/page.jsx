// app/dashboard/settings/page.jsx
import { currentUser } from "@clerk/nextjs/server";
import DashboardSettings from "@/components/dashboard/DashboardSettings";

export default async function SettingsPage() {
  try {
    const user = await currentUser();

    if (!user) {
      console.error("Clerk user not found.");
      return (
        <DashboardSettings
          user={null}
          error="You must be logged in to view this page."
        />
      );
    }

    const userMongoId = user.publicMetadata?.userMongoId;
    if (!userMongoId) {
      console.error("Missing userMongoId from Clerk publicMetadata.");
      return (
        <DashboardSettings
          user={null}
          error="Account is missing linked data. Please contact support."
        />
      );
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${userMongoId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const msg = await res.text();
      console.error("Failed to fetch user:", res.status, msg);
      return (
        <DashboardSettings
          user={null}
          error="Unable to load your profile. Please try again later."
        />
      );
    }

    const { user: mongoUser } = await res.json();
    return <DashboardSettings user={mongoUser} />;
  } catch (err) {
    console.error("Error loading profile:", err.message);
    return (
      <DashboardSettings
        user={null}
        error="An unexpected error occurred. Please try again."
      />
    );
  }
}
