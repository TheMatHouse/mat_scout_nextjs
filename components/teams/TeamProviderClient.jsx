// components/teams/TeamProviderClient.jsx
"use client";

import { TeamProvider } from "@/context/TeamContext";

export default function TeamProviderClient({ team, children }) {
  return <TeamProvider initialTeam={team}>{children}</TeamProvider>;
}
