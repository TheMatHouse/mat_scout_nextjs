"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/context/UserContext";

export default function LogoutButton() {
  const { logout } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout(); // ✅ Clears context + calls API
      router.push("/login"); // Redirect after logout
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
      className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
