"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/context/UserContext";

function LogoutButton() {
  const { logout } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout(); // clears context + calls API
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="
  font-medium
  text-white
  hover:text-ms-light-red
  hover:underline
  transition-colors
  disabled:opacity-60
"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}

export default LogoutButton;
