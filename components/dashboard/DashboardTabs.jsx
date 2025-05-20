"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import DashboardSettings from "./DashboardSettings";
import DashboardStyles from "./DashboardStyles";
import DashboardMatches from "./DashboardMatches";
import DashboardScouting from "./DashboardScouting";

const DashboardTabs = ({ user, styles, techniques }) => {
  const searchParams = useSearchParams();

  const view = searchParams.get("v");

  // const athlete = JSON.parse(user);

  return (
    <div className="w-full">
      <div className="overflow-x-auto whitespace-nowrap border-b border-gray-100">
        <ul className="flex text-sm font-medium text-center text-gray-900">
          <li className="me-2 flex-shrink-0">
            <a
              href="?v=settings"
              className={`inline-block p-4 rounded-t-lg ${
                view === "settings" || view === null
                  ? "bg-ms-blue-gray dark:bg-ms-blue-gray text-white"
                  : "bg-gray-100"
              }`}
            >
              Settings
            </a>
          </li>
          <li className="me-2 flex-shrink-0">
            <a
              href="?v=styles"
              className={`inline-block p-4 rounded-t-lg ${
                view === "styles"
                  ? "bg-ms-blue-gray dark:bg-ms-blue-gray text-white"
                  : "bg-gray-100"
              }`}
            >
              Styles/Sports
            </a>
          </li>
          <li className="me-2 flex-shrink-0">
            <a
              href="?v=matches"
              className={`inline-block p-4 rounded-t-lg ${
                view === "matches"
                  ? "bg-ms-blue-gray dark:bg-ms-blue-gray text-white"
                  : "bg-gray-100"
              }`}
            >
              Match Reports
            </a>
          </li>
          <li className="me-2 flex-shrink-0">
            <a
              href="?v=scouting"
              className={`inline-block p-4 rounded-t-lg ${
                view === "scouting"
                  ? "bg-ms-blue-gray dark:bg-ms-blue-gray text-white"
                  : "bg-gray-100"
              }`}
            >
              Scouting Reports
            </a>
          </li>
          <li className="me-2 flex-shrink-0">
            <a
              href="?v=family"
              className={`inline-block p-4 rounded-t-lg ${
                view === "family"
                  ? "bg-ms-blue-gray dark:bg-ms-blue-gray text-white"
                  : "bg-gray-100"
              }`}
            >
              Family
            </a>
          </li>
        </ul>
      </div>
      <div className="border-t-2 p-2 border-gray-900 dark-border-gray-100">
        {view === "settings" ? (
          <DashboardSettings user={user} />
        ) : view === "styles" ? (
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
          "Family Info"
        ) : (
          <DashboardSettings user={user} />
        )}
      </div>
    </div>
  );
};

export default DashboardTabs;
