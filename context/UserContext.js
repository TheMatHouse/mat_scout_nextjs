"use client";
import { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log("🔍 Fetching user from /api/auth/me...");
        const res = await fetch("/api/auth/me");

        if (!res.ok) {
          const text = await res.text();
          console.warn("⚠️ User fetch failed:", res.status, text);
          setUser(null);
        } else {
          const data = await res.json();
          setUser(data);
          console.log("✅ Logged in user:", data);
        }
      } catch (err) {
        console.error("❌ Error fetching user:", err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
