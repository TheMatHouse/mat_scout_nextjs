"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Single source of truth for fetching the current user
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store", // avoid stale responses
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else if (res.status === 401) {
        setUser(null); // logged out is fine
      } else {
        console.error("Unexpected user fetch error:", res.status);
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  }, []);

  // Initial load uses the same function
  useEffect(() => {
    (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      setUser(null);
    }
  };

  return (
    <UserContext.Provider
      value={{ user, loading, setUser, logout, refreshUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
