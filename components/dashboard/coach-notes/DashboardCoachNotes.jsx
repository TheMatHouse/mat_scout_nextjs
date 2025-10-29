"use client";
import UserCoachNotesSection from "./UserCoachNotesSection";

function DashboardCoachNotes({ userId }) {
  return (
    <div className="space-y-6">
      <UserCoachNotesSection userId={userId} />
    </div>
  );
}

export default DashboardCoachNotes;
