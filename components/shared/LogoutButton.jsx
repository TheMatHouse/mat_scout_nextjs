"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function LogoutButton() {
  const { logout } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      // After logout, redirect to home or login page
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 text-ms-dark-red rounded hover:text-ms-light-red  disabled:opacity-50"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
