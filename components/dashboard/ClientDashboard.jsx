// components/dashboard/ClientDashboard.jsx
"use client";

import { useSearchParams } from "next/navigation";
import DashboardSettings from "./DashboardSettings";
import DashboardStyles from "./DashboardStyles";
import DashboardMatches from "./DashboardMatches";
import DashboardScouting from "./DashboardScouting";

export default function ClientDashboard({ user, styles, techniques }) {
  const searchParams = useSearchParams();
  const view = searchParams.get("v");

  return (
    <div className="w-full px-6 py-4">
      {view === "styles" ? (
        <DashboardStyles user={user} />
      ) : view === "matches" ? (
        <DashboardMatches
          user={user}
          styles={styles}
          techniques={techniques}
        />
      ) : view === "scouting" ? (
        <DashboardScouting
          user={user}
          styles={styles}
          techniques={techniques}
        />
      ) : view === "family" ? (
        <div>Family Info (Coming Soon)</div>
      ) : (
        <DashboardSettings user={user} />
      )}
    </div>
  );
}
