"use client";

import React from "react";

const FamilyScoutingReports = ({ member }) => {
  return (
    <div className="bg-background text-foreground p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Scouting Reports</h2>
      <p>
        This is a placeholder for scouting reports for{" "}
        <strong>
          {member.firstName} {member.lastName}
        </strong>
        . You’ll be able to view and manage scouting data here.
      </p>
    </div>
  );
};

export default FamilyScoutingReports;
