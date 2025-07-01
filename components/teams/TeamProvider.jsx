"use client";

import { TeamProvider } from "@/context/TeamContext";

export default function TeamWrapper({ team, children }) {
  return <TeamProvider initialTeam={team}>{children}</TeamProvider>;
}
