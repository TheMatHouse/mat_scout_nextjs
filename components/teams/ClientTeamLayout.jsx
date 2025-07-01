// components/teams/ClientTeamLayout.jsx
"use client";

import TeamProvider from "./TeamProvider";

export default function ClientTeamLayout({ children, team }) {
  return <TeamProvider team={team}>{children}</TeamProvider>;
}
