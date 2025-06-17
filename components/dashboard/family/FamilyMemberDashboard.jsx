"use client";

import { useState } from "react";
import FamilyMemberSettings from "./sections/FamilySettings";
import FamilyStyles from "./sections/FamilyStyles";
import FamilyMatches from "./sections/FamilyMatchReports";
import FamilyScoutingReports from "./sections/FamilyScoutingReports";

const TABS = [
  { id: "settings", label: "Settings" },
  { id: "styles", label: "Styles" },
  { id: "matches", label: "Match Reports" },
  { id: "scouting", label: "Scouting Reports" },
];

export default function FamilyMemberDashboard({ member }) {
  console.log("member ", member);
  const [activeTab, setActiveTab] = useState("settings");
  const renderTabContent = () => {
    switch (activeTab) {
      case "settings":
        return <FamilyMemberSettings member={member} />;
      case "styles":
        return <FamilyStyles member={member} />;
      case "matches":
        return <FamilyMatches member={member} />;
      case "scouting":
        return <FamilyScoutingReports member={member} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6 border-b border-gray-300 dark:border-gray-700">
        <nav className="flex flex-wrap gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-md font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-white text-black dark:bg-gray-900 dark:text-white shadow-md"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div>{renderTabContent()}</div>
    </div>
  );
}
