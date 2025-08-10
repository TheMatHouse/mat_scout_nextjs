// context/TeamContext.js
import { createContext, useContext, useState } from "react";

const TeamContext = createContext();

export function TeamProvider({ children, initialTeam = null }) {
  const [team, setTeam] = useState(initialTeam);

  return (
    <TeamContext.Provider value={{ team, setTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error("useTeam must be used within TeamProvider");
  return context;
};
