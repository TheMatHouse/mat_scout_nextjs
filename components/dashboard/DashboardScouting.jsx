// components/dashboard/DashboardScouting.jsx
"use client";

import { useState } from "react";
import MyScoutingReportsTab from "@/components/dashboard/scouting/MyScoutingReportsTab";
import TeamScoutingReportsTab from "@/components/dashboard/scouting/TeamScoutingReportsTab";

function DashboardScouting({ user, refreshUser }) {
  const [activeTab, setActiveTab] = useState("mine"); // "mine" | "team"

  const tabs = [
    { id: "mine", label: "My Reports" },
    { id: "team", label: "Team Reports" },
  ];

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Scouting Reports
        </h1>
        <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
          Create your own scouting reports and access reports your teams create
          for you.
        </p>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-300 dark:border-slate-700">
        <div className="inline-flex gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ms-blue
                  ${
                    isActive
                      ? "btn btn-primary"
                      : "text-gray-900 dark:text-gray-100 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === "mine" && (
          <MyScoutingReportsTab
            user={user}
            refreshUser={refreshUser}
          />
        )}
        {activeTab === "team" && <TeamScoutingReportsTab user={user} />}
      </div>
    </section>
  );
}

export default DashboardScouting;
