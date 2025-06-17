"use client";

import React from "react";

const FamilyStyles = ({ member }) => {
  return (
    <div className="bg-background text-foreground p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Styles</h2>
      <p>
        This is a placeholder for managing styles for{" "}
        <strong>
          {member.firstName} {member.lastName}
        </strong>
        . You can add rank history, styles, or promotions here.
      </p>
    </div>
  );
};

export default FamilyStyles;
