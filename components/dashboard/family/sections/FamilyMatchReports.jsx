"use client";

import React from "react";

const FamilyMatchReports = ({ member }) => {
  return (
    <div className="bg-background text-foreground p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Match Reports</h2>
      <p>
        This is a placeholder for match reports for{" "}
        <strong>
          {member.firstName} {member.lastName}
        </strong>
        . You’ll be able to view and add match reports here.
      </p>
    </div>
  );
};

export default FamilyMatchReports;
