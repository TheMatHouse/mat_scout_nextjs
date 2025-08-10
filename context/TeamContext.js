// context/TeamContext.js
"use client";
import { createContext, useContext, useState, useEffect } from "react";

// Provide a safe default so SSR doesn't explode
const TeamContext = createContext({ team: null, setTeam: () => {} });

export function TeamProvider({ initialTeam = null, children }) {
  const [team, setTeam] = useState(initialTeam);

  // Optional: keep initialTeam in sync if the prop changes
  useEffect(() => {
    setTeam(initialTeam);
  }, [initialTeam]);

  return (
    <TeamContext.Provider value={{ team, setTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => useContext(TeamContext);
