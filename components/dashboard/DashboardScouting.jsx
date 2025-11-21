// components/dashboard/DashboardScouting.jsx
"use client";

import { useState } from "react";

import MyScoutingReportsTab from "@/components/dashboard/scouting/MyScoutingReportsTab";
import TeamScoutingReportsTab from "@/components/dashboard/scouting/TeamScoutingReportsTab";

const DashboardScouting = ({ user }) => {
  const [activeTab, setActiveTab] = useState("my"); // "my" | "teams"

  return (
    <div className="px-4 md:px-6 lg:px-8 py-4">
      {/* Page header */}
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Scouting Reports
        </h1>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          Create your own scouting reports and access reports your teams create
          for you.
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-300 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("my")}
            className={[
              "px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
              activeTab === "my"
                ? "border-ms-blue text-gray-900 dark:text-gray-100"
                : "border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
            ].join(" ")}
          >
            My Reports
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("teams")}
            className={[
              "px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
              activeTab === "teams"
                ? "border-ms-blue text-gray-900 dark:text-gray-100"
                : "border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
            ].join(" ")}
          >
            Team Reports
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="pb-4">
        {activeTab === "my" ? (
          <MyScoutingReportsTab user={user} />
        ) : (
          <TeamScoutingReportsTab user={user} />
        )}
      </div>
    </div>
  );
};

export default DashboardScouting;
