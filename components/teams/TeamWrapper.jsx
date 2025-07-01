"use client";

import { useEffect } from "react";
import { TeamProvider, useTeam } from "@/context/TeamContext";

function TeamInitializer({ initialTeam, children }) {
  const { setTeam } = useTeam();

  useEffect(() => {
    setTeam(initialTeam);
  }, [initialTeam, setTeam]);

  return children;
}

export default function TeamWrapper({ team, children }) {
  return (
    <TeamProvider>
      <TeamInitializer initialTeam={team}>{children}</TeamInitializer>
    </TeamProvider>
  );
}
