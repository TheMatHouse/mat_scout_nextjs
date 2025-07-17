// context/UserContext.js
"use client";

import { createContext, useState, useContext, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient"; // Make sure this import exists

// Create the context
const UserContext = createContext();

// Provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const refreshUser = async () => {
    try {
      const res = await apiFetch("/api/auth/me", {}, false);
      setUser(res?.user || null);
    } catch (err) {
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the user context
export const useUser = () => useContext(UserContext);
