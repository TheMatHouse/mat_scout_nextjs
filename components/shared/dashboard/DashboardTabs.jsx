"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import DashboardSettings from "./DashboardSettings";
import DashboardStyles from "./DashboardStyles";

const DashboardTabs = ({ user }) => {
  const searchParams = useSearchParams();

  const view = searchParams.get("v");

  // const athlete = JSON.parse(user);

  return (
    <div className="w-full">
      <ul className="flex flex-wrap text-sm font-medium text-center text-gray-900 border-b border-gray-100">
        <li className="me-2">
          <a
            href="?v=settings"
            aria-current="page"
            className={`inline-block p-4 text-gray-100 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-ms-blue-gray dark:hover:bg-ms-blue-gray rounded-t-lg ${
              view === "settings" || view === null
                ? "bg-ms-blue-gray dark:bg-ms-blue-gray"
                : "bg-gray-100"
            }`}
          >
            Seetings
          </a>
        </li>
        <li className="me-2">
          <a
            href="?v=styles"
            aria-current="page"
            className={`inline-block p-4 text-gray-100 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-ms-blue-gray dark:hover:bg-ms-blue-gray rounded-t-lg ${
              view === "styles"
                ? "bg-ms-blue-gray dark:bg-ms-blue-gray"
                : "bg-gray-100"
            }`}
          >
            Styles/Sports
          </a>
        </li>
        <li className="me-2">
          <a
            href="?v=family"
            aria-current="page"
            className={`inline-block p-4 text-gray-100 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-ms-blue-gray dark:hover:bg-ms-blue-gray rounded-t-lg ${
              view == "family"
                ? "bg-ms-blue-gray dark:bg-ms-blue-gray"
                : "bg-gray-100"
            }`}
          >
            Family
          </a>
        </li>
      </ul>
      <div className="border-t-2 p-2 border-gray-900 dark-border-gray-100">
        {view === "settings" ? (
          <DashboardSettings user={user} />
        ) : view === "styles" ? (
          <DashboardStyles user={user} />
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
