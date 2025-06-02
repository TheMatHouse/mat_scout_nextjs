// context/UserContext.js
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const data = await apiFetch("/api/auth/me");
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      if (err.message === "No token") {
        // Not logged in — this is okay
        setUser(null);
      } else {
        console.error("Error fetching user:", err);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <UserContext.Provider
      value={{ user, setUser, logout, loading, refreshUser: fetchUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
