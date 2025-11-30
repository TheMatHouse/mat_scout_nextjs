// components/dashboard/coach-notes/DashboardCoachNotes.jsx
"use client";

import TeamCoachNotesTab from "./TeamCoachNotesTab";

function DashboardCoachNotes({ userId, user }) {
  return (
    <div className="space-y-6">
      <TeamCoachNotesTab
        user={user}
        userId={userId}
      />
    </div>
  );
}

export default DashboardCoachNotes;
