import { createContext, useContext, useState, useEffect } from "react";

const TeamContext = createContext();

export function TeamProvider({ children }) {
  const [team, setTeam] = useState(null);

  useEffect(() => {
    // Fetch team logic already here
  }, []);

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
