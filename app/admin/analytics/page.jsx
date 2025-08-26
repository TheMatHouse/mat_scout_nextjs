export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import GAOverview from "@/components/analytics/GAOverview";

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>
      <p className="text-gray-600 dark:text-gray-300">
        GA4 summary via the Google Analytics Data API.
      </p>
      <GAOverview initialDays={7} />
    </div>
  );
}
